import CryptoWallet from "../wallet/crypto-wallet";
import {AddWalletResponse} from "../../interfaces/generic/default-responses";
import {IWallet} from "../../interfaces/wallet/interface-wallet";
import FSDatabase from "../io/FSDatabase";
import {DfkProfile} from "../../interfaces/dfk/iprofile";
import {Wallet} from "ethers";

const ethers = require("ethers");

const profileAbi = require("../../../abis/dfk-profile.json");
const heroAbi = require("../../../abis/dfk-hero.json");
const jewelAbi = require("../../../abis/jewel-token-abi.json");
const questAbi = require("../../../abis/dfk-quests.json");

const config = require('../../../config.json');

const Web3 = require('web3');
const BN = require('bn.js');

const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GenerateWalletsWorkFlow {
    private static _instance: GenerateWalletsWorkFlow;
    private cryptoWallet: CryptoWallet;
    private fsDb: FSDatabase;

    public trustedWallets: Wallet[];
    public currentWallets?: [IWallet] | null;

    private newlyAddedWallets?: [IWallet] | null;

    private callOptions = {gasPrice: config.transactionSettings.gasPrice, gasLimit: config.transactionSettings.gasLimit};
    private provider: any;

    constructor() {
        this.cryptoWallet = new CryptoWallet();
        this.fsDb = new FSDatabase();
        this.trustedWallets = [];

        this.loadCurrentWallets();
    }

    public static get instance() {
        this._instance = this._instance || new this();
        return this._instance;
    }

    public get jewelContract() : any {
        return new ethers.Contract(
            config.contracts.jewelToken.address,
            jewelAbi,
            this.provider
        );
    }

    public get questContract() : any {
        return new ethers.Contract(
            config.contracts.quest.address,
            questAbi,
            this.provider
        );
    }

    public get heroContract() : any {
        return new ethers.Contract(
            config.contracts.hero.address,
            heroAbi,
            this.provider
        );
    }

    public get profileContract() : any {
        return new ethers.Contract(
            config.contracts.profile.address,
            profileAbi,
            this.provider
        );
    }

    public async init() : Promise<void> {
        //Setup provider and contracts
        if(config.rpc.mode === "websocket")
            this.provider = await new ethers.providers.WebSocketProvider(config.rpc.websocket.urls[0]);
        else {
            this.provider = await new ethers.providers.JsonRpcProvider(config.rpc.https.urls[0]);
        }
    }

    public async getAllWallets() : Promise<IWallet[]> {
        let wallets: IWallet[] = [];

        for (const wallet of this.currentWallets!) {
            const currentWalletBalance = await this.getWalletBalance(wallet);
            wallet.currentBalance = currentWalletBalance;
            wallets.push(wallet);
        }

        this.saveCurrentWallets();

        return wallets;
    }

    public async menuInit() : Promise<void> {
        let walletsAlreadyOnboarded = 0;
        let walletsOnboarded = 0;
        let walletsNotOnboarded = 0;

        console.log('=====================================================================================================================');
        console.log(`Updating Wallets on Quests Index... (this can take awhile based on how many wallets there are!`);
        console.log('=====================================================================================================================');

        this.checkForWalletsOnQuests();

        console.log('=====================================================================================================================');
        console.log(`Checking ONE Balances... (this can take awhile based on how many wallets there are!`);
        console.log('=====================================================================================================================');

        await this.loadOneBalances();

        console.log('=====================================================================================================================');
        console.log(`Checking wallets for DFK Onboarding... (this can take awhile based on how many wallets there are!`);
        console.log('=====================================================================================================================');

        for (const walletToFund of this.currentWallets!) {
            try {
                //Does wallet need onboarded?
                if (!walletToFund.hasDfkProfile) {
                    if(walletToFund.currentBalance?.length! > 0) {
                        const hasTrueDfkProfile = await this.getDfkProfileByAddress(walletToFund);
                        if (!hasTrueDfkProfile) {
                            console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => Attempting to onboard to DFK.`);
                            const profileCreated = await this.onBoardWalletToDefiKingdoms(walletToFund);
                            if (profileCreated) {
                                walletToFund.hasDfkProfile = true;

                                console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => Has been onboarded to DFK.`);

                                walletsOnboarded++;
                            } else {
                                console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => NOT Onboarded (Transaction Error)`);

                                walletToFund.hasDfkProfile = false;
                                walletsNotOnboarded++;
                            }
                        } else {
                            console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => Already has been onboarded to DFK!`);

                            walletToFund.hasDfkProfile = true;
                            walletsAlreadyOnboarded++;
                        }
                    } else {
                        console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => NOT Onboarded (Need ONE)`);

                        walletToFund.hasDfkProfile = false;
                        walletsNotOnboarded++;
                    }
                } else {
                    walletToFund.hasDfkProfile = true;

                    console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => Has Already been onboarded to DFK.`);

                    walletsAlreadyOnboarded++;

                    if(!walletToFund.dfkProfile) {
                        walletToFund.dfkProfile = await this.getDfkProfileByAddress(walletToFund);
                    }
                }
            } catch (e) {

            }

            await sleep(1000);
        }

        //Build proper list of heroes
        this.buildProperHeroListForWallets();

        console.log('=====================================================================================================================');
        console.log(`Checking Balances & Active Heros on Quests....(this can take awhile based on how many wallets there are!`);
        console.log('=====================================================================================================================');

        await this.loadJewelBalances();
        await this.checkForWalletsOnQuests();

        this.saveCurrentWallets();

        console.log(`[${walletsAlreadyOnboarded}:Wallets Already Onboarded] / [${walletsOnboarded}:Wallets Newly Onboarded] / [${walletsNotOnboarded}:Wallets NOT Onboarded]`);
        console.log('=====================================================================================================================');

        await this.ensureJewelIsOnSourceWallet();

        //Save changes to local data files
        this.saveCurrentWallets();
    }

    public async loadOneBalances(save?: boolean) : Promise<void> {
        console.log('Checking Wallets Harmony ONE Balances.....');

        try {
            for (const walletToFund of this.currentWallets!) {
                //Update the balance of each wallet
                walletToFund.currentBalance = await this.getWalletBalance(walletToFund);
            }

            if(save) {
                this.saveCurrentWallets();
            }
        }catch (e) {

        }

        console.log('ONE Balance Check Complete.....');
    }

    public async loadJewelBalances(save?: boolean, silent?: boolean) : Promise<void> {
        try {
            if(!silent)
                console.log('Checking Wallets for Jewel.....');

            for (const walletToFund of this.currentWallets!) {
                //Get Jewel Balance
                walletToFund.jewelBalance = await this.getJewelBalance(walletToFund);
                if(walletToFund.jewelBalance === "0")
                    walletToFund.isHoldingTheJewel = false;
                else
                    walletToFund.isHoldingTheJewel = true;
            }

            if(save) {
                this.saveCurrentWallets();
            }
        }catch (e) {

        }

        console.log('Jewel Check Complete.....');
    }

    public async ensureJewelIsOnSourceWallet(save?: boolean) : Promise<void> {
        console.log('Making sure Jewel is on source wallet!');

        //Does the NON SOURCE wallet have the jewel?
        if(!this.currentWallets?.find(x=> x.isPrimarySourceWallet && x.jewelBalance != "0"))
        {
            //Non source DOES NOT have the jewel!  We gotta move it back !!!
            //Which wallet has the jewel?
            const jewelHolder = this.currentWallets?.find(x=> x.isPrimarySourceWallet === false && x.jewelBalance != "0");
            const sourceWallet = this.currentWallets?.find(x=> x.isPrimarySourceWallet);

            if(jewelHolder && sourceWallet) {
                const currentJewelHolder = await this.getTrueWallet(jewelHolder);
                const jewelOwner = await this.getTrueWallet(sourceWallet);

                if(currentJewelHolder.privateKey !== jewelOwner.privateKey) {
                    const moveJewelBackToSourceResult = await this.transferLockedJewel(currentJewelHolder, jewelOwner);
                    if (moveJewelBackToSourceResult) {
                        console.log(`Jewel was on non source wallet! => Moved Jewel Back To Owner [Wallet:${sourceWallet.address}] FROM => [Wallet:${jewelHolder.address}]`);
                    } else {
                        console.log(`Jewel was on non source wallet! FAILED TO MOVE!!! => Moved Jewel Back To Owner [Wallet:${sourceWallet.address}] FROM => [Wallet:${jewelHolder.address}]`);
                    }

                    sourceWallet.isHoldingTheJewel = true;
                    sourceWallet.jewelBalance = jewelHolder.jewelBalance;

                    jewelHolder.isHoldingTheJewel = false;
                    jewelHolder.jewelBalance = "0";
                } else {
                    console.log(`Jewel is already on the main wallet! => [Wallet:${sourceWallet.address}] `);
                }
            }
        } else {
            console.log('Locked Jewel is already on the source wallet!');
        }

        if(save) {
            this.saveCurrentWallets();
        }
    }

    public async checkForWalletsOnQuests() : Promise<{ success: boolean, walletsOnQuests?: IWallet[] }> {
          console.log('Checking Wallets Hero Questing Statuses.....')

        let walletsOnQuests: IWallet[] = [];

        try {
            const walletList = this.currentWallets!.map((w) => w);

            for (const walletOnQuest of walletList) {
                console.log(`Checking Quest Status => [Wallet:${walletOnQuest.address}] => [HeroId:${walletOnQuest.assignedHero}]`);

                if(walletOnQuest.assignedHero) {
                    // Here we are just making sure this hero and wallet are truly on a quest !
                    let heroActiveQuest = await this.questContract.getHeroQuest(walletOnQuest.assignedHero);
                    if (heroActiveQuest && heroActiveQuest.quest !== "0x0000000000000000000000000000000000000000" && heroActiveQuest.heroes.length > 0) {
                        walletOnQuest.isOnQuest = true;

                        let qStartTime = parseInt(heroActiveQuest.startTime);
                        let qCompleteAtTime = parseInt(heroActiveQuest.completeAtTime);

                        if(qStartTime) {
                            walletOnQuest.questStartedAt = new Date(qStartTime*1000);
                        }

                        if(qCompleteAtTime) {
                            walletOnQuest.questCompletesAt = new Date(qCompleteAtTime*1000);
                        }

                        walletsOnQuests.push(walletOnQuest);

                        console.log(`Wallet is on quest! => [Wallet:${walletOnQuest.address}] => [HeroId:${walletOnQuest.assignedHero}]`);
                    } else {
                        walletOnQuest.isOnQuest = false;
                        walletOnQuest.questStartedAt = undefined;

                        console.log(`Wallet is NOT on quest! => [Wallet:${walletOnQuest.address}] => [HeroId:${walletOnQuest.assignedHero}]`);
                    }
                }
            }
        } catch (e) {
            return {
                success: false
            }
        }

        this.saveCurrentWallets();

        console.log(`Hero Quest Check Complete... [Wallets On Quests:${walletsOnQuests.length}]`);

        return {
            success: true,
            walletsOnQuests
        }
    }

    public get sourceWallet() : IWallet | null {
        return this.currentWallets?.find(x=> x.isPrimarySourceWallet === true) ?? null;
    }

    public async generateWallets(numberOfWallets: Number): Promise<AddWalletResponse> {
        try {
            for (var i = 0; i < numberOfWallets; i++) {
                const newEthWallet = await this.cryptoWallet.createWallet();
                if(newEthWallet) {
                    const newWallet: IWallet = {
                        isPrimarySourceWallet: false,
                        name: `Wallet ${this.currentWallets ? this.currentWallets!.length + 1 : 1}`,
                        address: newEthWallet.address,
                        publicKey: newEthWallet.publicKey,
                        privateKey: newEthWallet.privateKey,
                        mnemonicPhrase: newEthWallet.mnemonic.phrase,
                        mnemonicPath: newEthWallet.mnemonic.path,
                        mnemonicLocale: newEthWallet.mnemonic.locale,
                        currentBalance: "0"
                    }

                    // Add wallets created in THIS instance
                    if(!this.newlyAddedWallets) {
                        this.newlyAddedWallets = [newWallet];
                    } else {
                        this.newlyAddedWallets.push(newWallet);
                    }

                    // Add newly created wallets to our OVERALL instance
                    if(!this.currentWallets) {
                        this.currentWallets = [newWallet];
                    } else {
                        this.currentWallets.push(newWallet);
                    }
                }

                console.log(`Created new Wallet!   [Wallet:${newEthWallet.address}]`);

                await sleep(2000);
            }

            //ReWrite our wallet file with all the new wallets
            await this.saveCurrentWallets();

            //Reload all wallets
            this.loadCurrentWallets();

            // Make sure each wallet has the proper id
            for(var i=0;i<this.newlyAddedWallets!.length; i++) {
                const properWalletInfo = this.currentWallets?.find(x=>x.address === this.newlyAddedWallets![i].address);
                if(properWalletInfo) {
                    this.newlyAddedWallets![i].keyId = properWalletInfo.keyId;
                }
            }

            // Return a list of the newly created wallets with their newly updated keyId's
            return {
                success: true,
                newWallets: this.newlyAddedWallets!
            }

        } catch (e) {
            return {
                success: false,
                error: e,
                newWallets: this.newlyAddedWallets!
            }
        }
    }

    public async markWalletAsPrimarySource(keyId: number): Promise<void> {
        if(this.currentWallets) {
            const matchingWallet = this.currentWallets.find((wallet) => wallet.keyId === keyId);
            if(matchingWallet) {
                // Mark all other wallets as false
                for(var i=0;i<this.currentWallets.length;i++) {
                    this.currentWallets[i].isPrimarySourceWallet = false;
                }

                // Mark as primary funding source
                matchingWallet.isPrimarySourceWallet = true;

                //ReWrite our wallet file with all the new wallets
                await this.saveCurrentWallets();

                //Reload all wallets
                this.loadCurrentWallets();
            }
        }
    }

    public async addManualWallet(name: string, address: string, publicKey: string, privateKey: string, mnemonicPhrase: string, isPrimarySource: boolean = false): Promise<void> {
        const newWallet: IWallet = {
            name,
            address,
            publicKey,
            privateKey,
            mnemonicPhrase,
            isPrimarySourceWallet: isPrimarySource
        }

        if(!this.currentWallets) {
            this.currentWallets = [newWallet];
        } else {
            this.currentWallets.push(newWallet);
        }

        //ReWrite our wallet file with all the new wallets
        await this.saveCurrentWallets();

        //Reload all wallets
        this.loadCurrentWallets();
    }

    public async transferHeroToWallet(sourceWallet: IWallet, destinationWallet: IWallet, heroId: number) : Promise<boolean> {
        try {
            const result = await this.tryTransaction(
                () =>
                    this.heroContract.connect(GenerateWalletsWorkFlow.instance.getTrueWallet(sourceWallet))
                        .transferFrom(
                            sourceWallet.address,
                            destinationWallet.address,
                            heroId,
                            this.callOptions
                        ),
                2
            );

            if(result && result.success) {
                return true;
            } else {
                return false;
            }

        } catch (error) {
            console.log({mode: 'error', error});
        }

        return false;
    }

    public async buildProperHeroListForWallets() : Promise<void> {
        for (const wallet of this.currentWallets!) {
            //Empty list of all available heroes (rebuilding below)
            wallet.availableHeroes = {
                heroes: []
            }

            const walletHeroes = await this.getAllHeroesByWallet(wallet);
            if(walletHeroes && walletHeroes.length > 0) {
                let isFirstHero = true;
                for (const hero of walletHeroes) {
                    if(isFirstHero) {
                        wallet.assignedHero = hero;
                        isFirstHero=false;
                    }

                    wallet.availableHeroes?.heroes?.push(hero);
                }
            } else {
                wallet.assignedHero = undefined;
                wallet.availableHeroes = undefined;
            }
        }

        this.saveCurrentWallets();
    }

    public async getAllHeroesByWallet(wallet: IWallet) : Promise<number[]> {
        let heroList: number[] = [];

        try {
            const walletHeroes = await this.heroContract.getUserHeroes(wallet.address);
            if(walletHeroes) {
                for (var i = 0; i < walletHeroes.length; i++) {
                    const heroId = parseInt(walletHeroes[i]);
                    if (heroId) {
                        heroList.push(heroId);
                    }
                }
            }
        } catch (error) {
            console.log({mode: 'error', error});
        }

        return heroList;
    }

    public async fundWallets(amountOfOneToSend: number) : Promise<boolean> {
        let walletsAlreadyOnboarded = 0;
        let walletsOnboarded = 0;
        let walletsNotOnboarded = 0;

        if(this.currentWallets) {
            const sourceWallet = this.currentWallets.find(x=>x.isPrimarySourceWallet === true);
            if(sourceWallet) {
                for (const walletToFund of this.currentWallets!) {
                    if(sourceWallet.address !== walletToFund.address) {
                        const currentWalletBalance = await this.getWalletBalance(walletToFund);
                        walletToFund.currentBalance = currentWalletBalance;

                        if(walletToFund.currentBalance) {
                            //Does the wallet have at least 25 tokens or more? if SO then dont fund it anymore
                            if(Number(walletToFund.currentBalance) >= 44) {
                                console.log(`[Wallet:${walletToFund.address}] => Already has enough ONE [Balance: ${walletToFund.currentBalance}].. skipping wallet...`);
                                continue;
                            }
                        }

                        console.log(`[Wallet:${walletToFund.address}] => Sending [${amountOfOneToSend}:funds] to wallet....`);

                        //Make sure we DO NOT re-fund source wallet, else ERRORS!
                        const fundResult = await this.sendOneToWallet(sourceWallet, walletToFund, amountOfOneToSend);
                        if(fundResult.success) {
                            walletToFund.currentBalance = fundResult.balance;

                            console.log('Funds transfered!');

                            this.saveCurrentWallets();
                        }
                    } else {
                        sourceWallet.currentBalance = await this.getWalletBalance(sourceWallet);
                    }
                }

                //Make sure to onboard to DFK if needed
                for (const walletToFund of this.currentWallets!) {
                    try {
                        //Does wallet need onboarded?
                        if (!walletToFund.hasDfkProfile) {
                            if (walletToFund.currentBalance?.length! > 0) {
                                const hasTrueDfkProfile = await this.getDfkProfileByAddress(walletToFund);
                                if (!hasTrueDfkProfile) {
                                    console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => Attempting to onboard to DFK.`);
                                    const profileCreated = await this.onBoardWalletToDefiKingdoms(walletToFund);
                                    if (profileCreated) {
                                        walletToFund.hasDfkProfile = true;
                                        console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => Has been onboarded to DFK.`);
                                        walletsOnboarded++;

                                        this.saveCurrentWallets();
                                    } else {
                                        console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => NOT Onboarded (Transaction Error)`);
                                        walletToFund.hasDfkProfile = false;
                                        walletsNotOnboarded++;
                                    }
                                } else {
                                    console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => Already has been onboarded to DFK!`);
                                    walletToFund.hasDfkProfile = true;
                                    walletsAlreadyOnboarded++;
                                }
                            } else {
                                console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => NOT Onboarded (Need ONE)`);
                                walletToFund.hasDfkProfile = false;
                                walletsNotOnboarded++;
                            }
                        } else {
                            walletToFund.hasDfkProfile = true;
                            console.log(`[KeyId:${walletToFund.keyId}] => [Wallet:${walletToFund.address}] => [ONE Balance:${walletToFund.currentBalance}] => Has Already been onboarded to DFK.`);
                            walletsAlreadyOnboarded++;

                            if (!walletToFund.dfkProfile) {
                                walletToFund.dfkProfile = await this.getDfkProfileByAddress(walletToFund);
                            }

                            this.saveCurrentWallets();
                        }
                    } catch (e) {

                    }
                }

                this.saveCurrentWallets();

                console.log(`[${walletsAlreadyOnboarded}:Wallets Already Onboarded] / [${walletsOnboarded}:Wallets Newly Onboarded] / [${walletsNotOnboarded}:Wallets NOT Onboarded]`);
                console.log('=====================================================================================================================');

                return true;
            }
        }

        return false;
    }

    public async getDfkProfileByAddress(sourceWallet: IWallet) : Promise<DfkProfile | null> {
        try {
            const getWalletProfile = await this.profileContract.getProfileByAddress(
                sourceWallet.address
            );

            if (getWalletProfile) {
                return {
                    id: getWalletProfile[0],
                    address: getWalletProfile[1],
                    name: getWalletProfile[2],
                    creationTime: getWalletProfile[3],
                    picId: getWalletProfile[4],
                    heroId: getWalletProfile[5],
                    points: getWalletProfile[6]
                }
            }
        } catch (error) {
            //ONLY errors if no profile exists!
        }

        return null;
    }

    public async onBoardWalletToDefiKingdoms(sourceWallet: IWallet) : Promise<boolean> {
        try {
            const result = await this.tryTransaction(
                () =>
                    this.profileContract.connect(this.getTrueWallet(sourceWallet))
                        .createProfile(
                            sourceWallet.name,
                            0,
                            0,
                            this.callOptions
                        ),
                2
            );

            if(result && result.success) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            //console.log({mode: 'error', error});
        }

        return false;
    }

    public async getWalletBalance(sourceWallet: IWallet) : Promise<string> {
        try {
            const web3 = new Web3(config.rpc.https.urls[0]);

            let hmyMasterAccount = web3.eth.accounts.privateKeyToAccount(sourceWallet.privateKey!);
            web3.eth.accounts.wallet.add(hmyMasterAccount);
            web3.eth.defaultAccount = hmyMasterAccount.address

            const newAddrBalance = await web3.eth.getBalance(sourceWallet.address);

            return `${newAddrBalance / 1e18}`;
        } catch (e) {
            return "0";
        }
    }

    public async sendOneToWallet(sourceWallet: IWallet, destination: IWallet, amountOfOneToSend: number) : Promise<{  success: boolean, balance?: string }> {
        try {
            const web3 = new Web3(config.rpc.https.urls[0]);

            let hmyMasterAccount = web3.eth.accounts.privateKeyToAccount(sourceWallet.privateKey!);
            web3.eth.accounts.wallet.add(hmyMasterAccount);
            web3.eth.defaultAccount = hmyMasterAccount.address

            //Set nonce
            let nonce = await web3.eth.getTransactionCount(sourceWallet.address);

            const gasPrice = new BN(await web3.eth.getGasPrice()).mul(new BN(1));
            const gasLimit = 6721900;

            const value = amountOfOneToSend * 1e18; // 1 ONE

            const from = web3.eth.defaultAccount;
            const to = destination.address;

            const result = await web3.eth
                .sendTransaction({ from, to, value, nonce: nonce++, gasPrice, gasLimit });

            await sleep(2000);

            const newAddrBalance = await web3.eth.getBalance(destination.address);
            console.log(`[${destination.address}] => Destination Balance: `, newAddrBalance / 1e18);

            if (result && result.status) {
                return {
                    success: true,
                    balance: `${newAddrBalance / 1e18}`
                };
            } else {
                return {
                    success: false
                };
            }
        } catch (e) {
            console.log({ section: 'sendOneToWallet', error: e });
        }

        return {
            success: false
        };
    }

    public async clearAllWallets() : Promise<void> {
        this.currentWallets = null;

        await this.saveCurrentWallets();
    }

    private loadCurrentWallets() : void {
        try {
            // Load wallets from flat file
            this.currentWallets = this.fsDb.readDataFile<[IWallet]>('wallets');

            //Make sure wallets are proper sorted (source wallet should always be first)
            this.currentWallets?.sort((a: IWallet, b: IWallet) => (a.isPrimarySourceWallet > b.isPrimarySourceWallet) ? -1 : 1);
        } catch(e) {
            this.currentWallets = null;
        }
    }

    public async saveCurrentWallets() : Promise<void> {
        if(this.currentWallets) {
            //Sort wallets. Making the SOURCE wallet FIRST
            this.currentWallets?.sort((a: IWallet, b: IWallet) => (a.isPrimarySourceWallet > b.isPrimarySourceWallet) ? -1 : 1);

            //Re-Key all wallets (source wallet first (if set))
            for (var i = 0; i < this.currentWallets!.length; i++) {
                this.currentWallets[i].keyId = i+1;
            }

            this.fsDb.writeDataFile('wallets', this.currentWallets);
        } else {
            this.fsDb.writeDataFile('wallets', []);
        }
    }

    public async getJewelBalance(wallet: IWallet) : Promise<string> {
        try {
            const balance = await this.jewelContract.balanceOf(wallet.address);
            if(balance) {
                return `${parseInt(balance)}`;
            }
        }catch (e) {

        }

        return "0";
    }

    public async transferLockedJewel(sourceWallet: Wallet, destinationWallet: Wallet) : Promise<{ success: boolean, receipt?: any }> {
        try{
            if(sourceWallet.privateKey === destinationWallet.privateKey) {
                //NEVER EVER SEND TO SELF!!!
                return {
                    success: false
                };
            }

            //Call the contract and wait for transaction to occur
            const result = await this.tryTransaction(
                () =>
                    this.jewelContract.connect(sourceWallet)
                        .transferAll(destinationWallet.address),
                2
            );

            if(result && result.success) {
                return result;
            } else {
                return {
                    success: false
                }
            }
        } catch (err) {
            console.log({mode: 'error', error: err});
        }

        return {
            success: false
        }
    }

    //Utility Methods

    private async tryTransaction(transaction: any, attempts: number) : Promise<{ success: boolean, receipt?: any, error?: any } | undefined> {
        try {
            var tx = await transaction();
            let receipt = await tx.wait();
            if (receipt.status !== 1) {
                return {
                    success: false,
                    receipt
                }
            } else {
                return {
                    success: true,
                    receipt
                }
            }
        } catch(e) {
            return {
                success: false,
                error: e
            }
        }
    }

    public getTrueWallet(wallet: IWallet) : Wallet {
        const walletInList = this.trustedWallets.find((w) => w.privateKey.indexOf(wallet!.privateKey!) > -1);
        if(walletInList) {
            return walletInList;
        } else {
            const newWallet = new ethers.Wallet(wallet.privateKey, this.provider);
            //Add to running list
            this.trustedWallets.push(newWallet);
            //Return newly generated wallet
            return newWallet;
        }
    }
}