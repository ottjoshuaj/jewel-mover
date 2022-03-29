import {Wallet} from "ethers";
import GenerateWalletsWorkFlow from "./generate-wallets-work-flow";
import {IWallet} from "../../interfaces/wallet/interface-wallet";

const ethers = require("ethers");
const Web3 = require('web3');
const BN = require('bn.js');

const config = require('../../../config.json');

const profileAbi = require("../../../abis/dfk-profile.json");
const heroAbi = require("../../../abis/dfk-hero.json");
const jewelAbi = require("../../../abis/jewel-token-abi.json");
const questAbi = require("../../../abis/dfk-quests.json");

const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export default class QuestingWorkFlow {
    private provider: any;
    private callOptions = {gasPrice: config.transactionSettings.gasPrice, gasLimit: config.transactionSettings.gasLimit};

    constructor() {
        //Setup provider and contracts
        if(config.rpc.mode === "websocket")
            this.provider = new ethers.providers.WebSocketProvider(config.rpc.websocket.urls[0]);
        else {
            this.provider = new ethers.providers.JsonRpcProvider(config.rpc.https.urls[0]);
        }
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

    public get mineableWallets() : IWallet[] {
        return GenerateWalletsWorkFlow.instance.currentWallets!.filter((wallet) => {
            return wallet.hasDfkProfile && wallet.currentBalance?.length! > 0 && wallet.assignedHero && wallet.privateKey && !wallet.isOnQuest
        });
    }

    public get miningWallets() : IWallet[] {
        return GenerateWalletsWorkFlow.instance.currentWallets!.filter((wallet) => {
            return wallet.hasDfkProfile && wallet.currentBalance?.length! > 0 && wallet.assignedHero && wallet.isOnQuest && wallet.privateKey
        });
    }

    public get miningWalletsReadyForCancel() : IWallet[] {
        let walletsToCancel: IWallet[] = [];

        //Clone list
        const miningWallets = this.miningWallets.map((w) => w);

        for(const wallet of miningWallets) {
            const questStartedTime = new Date(wallet.questStartedAt!);
            const currentTime = new Date();
            const duration = currentTime.valueOf() - questStartedTime.valueOf();

            //Is this wallet hero thats on a quest ready to cancel ?
            if(duration >= config.questSettings.cancelQuestsAfterMilliseconds) {
                walletsToCancel.push(wallet);
            }
        }

        return walletsToCancel;
    }

    public async startQuesting() : Promise<number> {
        let walletsMining: number = 0;

        //Get a list of wallets that is capable of mining Jewl
        const walletsAbleToMine = this.mineableWallets.map((w) => w);

        if(walletsAbleToMine && walletsAbleToMine.length > 0) {
            //Make sure JEWEL is on the FIRST account in the list!
            console.log(`Checking the location of our jewel....`);
            const jewelHolderWallet = GenerateWalletsWorkFlow.instance.currentWallets?.find((x) => {
                return x.jewelBalance != "0"
            });
            if (jewelHolderWallet) {
                //Ok we found the jewel.  Lets get the jewel moved to the FIRST wallet in the list ONLY IF its not already there!
                if (jewelHolderWallet.address != walletsAbleToMine[0].address) {
                    const sourceWallet = await GenerateWalletsWorkFlow.instance.getTrueWallet(jewelHolderWallet);
                    const destinationWallet = await GenerateWalletsWorkFlow.instance.getTrueWallet(walletsAbleToMine[0]);

                    console.log(`Jewl Found On => [Wallet:${sourceWallet.address}] => Moving it to => [Wallet:${destinationWallet.address}]`);

                    const sendJewelToFirstWalletInList = await this.transferLockedJewel(sourceWallet, destinationWallet);
                    if (!sendJewelToFirstWalletInList.success) {
                        //Failed to move jewel to the new wallet. Damn it, wtf is going on?  EXIT!
                        console.log(`Was unable to move the jewel to the first minable wallet! [Source:${sourceWallet.address}] => [Destination:${destinationWallet.address}] => Flow Terminated!`);
                        return 0;
                    } else {
                        console.log(`Jewel has been succesfully moved to the FIRST wallet! [Source:${sourceWallet.address}] => [Destination:${destinationWallet.address}] => Moving to quest start wallet!`);
                    }
                } else {
                    //Current wallet already the bag holder!
                    console.log(`Jewl Moved! => [Wallet:${walletsAbleToMine[0].address}]`);
                }
            } else {
                //Unable to find the jewel wallet.  uh oh... wtf is it?
                console.log('UNABLE TO FIND WALLET HOLDING JEWEL.... Better check each wallet! => Flow Terminated!');
                return 0;
            }
        }

        //Loop through these wallets, start hero on MINE quest,  move jewel to next wallet in line (or if LAST wallet, moves to FIRST wallet)
        for (var i=0; i<walletsAbleToMine.length;i++) {
            const index = i;
            const walletToQuestWith = walletsAbleToMine[index];
            let isLastWallet: boolean = false;

            if(index == walletsAbleToMine.length-1) {
                isLastWallet = true;
            }

            //Get the ETHERS Wallet instance
            const currentWallet = GenerateWalletsWorkFlow.instance.getTrueWallet(walletToQuestWith);

            console.log(`Sending [Hero:${walletToQuestWith.assignedHero}] From [Wallet:${walletToQuestWith.address}] on mining quest....`);

            // Start the mining quest
            const mineQuestReceipt = await this.startMiningQuest(currentWallet, [walletToQuestWith.assignedHero!]);

            //Quest was successful.  Move jewel to next wallet or LAST wallet rule dependent
            if(mineQuestReceipt.success) {
                console.log(`Success.... [Hero:${walletToQuestWith.assignedHero}] From [Wallet:${walletToQuestWith.address}] is now mining....`);

                //Set Local Data settings
                const updWalletInfo = this.mineableWallets.find(x=>x.privateKey === walletToQuestWith.privateKey);
                if(updWalletInfo) {
                    walletToQuestWith.isOnQuest = true;
                    walletToQuestWith.questStartedAt = new Date();

                    //Save wallet updates
                    await GenerateWalletsWorkFlow.instance.saveCurrentWallets();
                }

                //Ok lets move the locked jewel to the NEXT wallet (if we are on the LAST wallet though we need to move it back to the FIRST wallet.)
                let isLastWallet: boolean = false;
                let destinationWallet: any;

                try {
                    // Current wallet in loop the last ?
                    if(!isLastWallet) {
                        // NO,  so what we gotta do is get the NEXT wallet in line
                        const theNextWalletInLine = walletsAbleToMine[index+1]; //Next wallet available in arroy

                        //Set destination wallet as the NEXT wallet in line
                        destinationWallet = GenerateWalletsWorkFlow.instance.getTrueWallet(theNextWalletInLine);
                    } else {
                        //We are at the end of line. Last wallet in the loop!
                        //Set destination back to the very FIRST wallet thats considered the source.
                        const sourceWallet = GenerateWalletsWorkFlow.instance.currentWallets?.find(x=>x.isPrimarySourceWallet);
                        if(sourceWallet) {
                            //Found the source wallet.  Sent the jewel back!
                            destinationWallet = GenerateWalletsWorkFlow.instance.getTrueWallet(sourceWallet);
                        }
                    }
                } catch (e) {
                    const sourceWallet = GenerateWalletsWorkFlow.instance.currentWallets?.find(x=>x.isPrimarySourceWallet);
                    if(sourceWallet) {
                        //Found the source wallet.  Sent the jewel back!
                        destinationWallet = GenerateWalletsWorkFlow.instance.getTrueWallet(sourceWallet);
                    }
                }

                console.log(`Moving Jewel To The Next Wallet => [FROM WALLET:${currentWallet.address}] => [TO WALLET:${destinationWallet.address}]`);

                // Transfer the locked Jewel
                const jewelXferReceipt = await this.transferLockedJewel(currentWallet, destinationWallet);
                if(!jewelXferReceipt.success) {
                    console.log({ mode: 'error', error: `There was an error transfering locked jewel FROM=> [Wallet:${currentWallet.address}] => TO => [Wallet:${destinationWallet.address}]. Process terminated.`});
                    break;
                } else {
                    console.log(`Jewel was transferred => [IN WALLET:${destinationWallet.address}]`);
                }

                //Increment
                walletsMining++;
            } else {
                console.log(`Failed to start quest.... [Hero:${walletToQuestWith.assignedHero}] From [Wallet:${walletToQuestWith.address}]....`);
            }
        }

        //Ok lets find out if the SOURCE wallet truly has the jewel. If not lets move it back!
        const finalJewelHolder = GenerateWalletsWorkFlow.instance.currentWallets?.find((x)=> { return x.isHoldingTheJewel});
        if(finalJewelHolder && !finalJewelHolder.isPrimarySourceWallet) {
            //Get the primary source wallet
            const sourceWallet = GenerateWalletsWorkFlow.instance.sourceWallet;

            //Current jewel holder is NOT the primary wallet.  We gotta get it back!
            const currentJewelHolderWallet = await GenerateWalletsWorkFlow.instance.getTrueWallet(finalJewelHolder);
            const jewelOwner = await GenerateWalletsWorkFlow.instance.getTrueWallet(sourceWallet!);

            if(currentJewelHolderWallet.privateKey !== jewelOwner.privateKey) {
                console.log(`Moving Jewel Back To Source => [Current Wallet:${currentJewelHolderWallet.address}] => [Jewel OWner:${jewelOwner.address}]`);

                const sendJewlBackToSourceWallet = await this.transferLockedJewel(currentJewelHolderWallet, jewelOwner);
                if (sendJewlBackToSourceWallet) {
                    //Failed to move jewel to the new wallet. Damn it, wtf is going on?  EXIT!
                    console.log(`Jewel has been moved to the OWNER(SOURCE) [Source:${currentJewelHolderWallet.address}] => [Destination:${jewelOwner.address}]`);

                    //Set Flags
                    finalJewelHolder.isHoldingTheJewel = false;
                    sourceWallet!.isHoldingTheJewel = true;
                }
            }
        }

        //Save Jewel Updates
        await GenerateWalletsWorkFlow.instance.loadJewelBalances();

        //Save wallet updates
        await GenerateWalletsWorkFlow.instance.saveCurrentWallets();

        return walletsMining;
    }

    public async checkWalletsForStamina() : Promise<boolean> {
        let walletReadyToQuest: boolean = false;

        const usableWallets = this.mineableWallets.map((w) => w);

        try {
            for (const usableWallet of usableWallets) {
                //Is this wallet assigned a hero? privatekey is ok etc?
                if(usableWallet && usableWallet.assignedHero && usableWallet.privateKey) {
                    let heroStamina = parseInt(await this.questContract.getCurrentStamina(usableWallet.assignedHero));

                    //Set assigned hero stamina in local datastore
                    usableWallet.assignedHeroStamina = heroStamina;

                    //Is stamina for hero wallet over 15?
                    if(heroStamina >= 15) {
                        walletReadyToQuest = true;
                        console.log(`Hero Stamina Check => [Wallet:${usableWallet.address}] => [Hero:${usableWallet.assignedHero}] => [Stamina:${heroStamina}] => READY TO QUEST! :)`);
                    } else {
                        console.log(`Hero Stamina Check => [Wallet:${usableWallet.address}] => [Hero:${usableWallet.assignedHero}] => [Stamina:${heroStamina}] => NOT READY TO QUEST! :( `);
                    }
                }
            }

        } catch (e) {
            console.log(e);
            walletReadyToQuest = false; //Show FALSE to prevent a whacky system
        }

        //Save data file
        await GenerateWalletsWorkFlow.instance.saveCurrentWallets();

        return walletReadyToQuest;
    }

    public async checkQuestStatuses() : Promise<{ canCancel: boolean }> {
        //Find the LAST wallet that is on a quest to get the timespan it was sent on
        const miningWallets = this.miningWallets.map((w) => w);
        let canBeCanceled = false;

        //Lets loop through all wallets locally and see if there are any ready to be cancelled
        for(const wallet of miningWallets) {
            const questStartedTime = new Date(wallet.questStartedAt!);
            const currentTime = new Date();
            const duration = currentTime.valueOf() - questStartedTime.valueOf();

            console.log(`Checking Quest Status => [Wallet:${wallet.address}] => [HeroId:${wallet.assignedHero}]`);

            //Is this wallet hero thats on a quest ready to cancel ?
            if(duration >= config.questSettings.cancelQuestsAfterMilliseconds) {
                console.log(`Hero quest CAN BE CANCELED! => [Wallet:${wallet.address}] => [HeroId:${wallet.assignedHero}]`);

                canBeCanceled = true;
            } else {
                console.log(`Hero quest not ready to be canceled => [Wallet:${wallet.address}] => [HeroId:${wallet.assignedHero}]`);
            }
        }

        if(canBeCanceled) {
            console.log('At least one wallet has a hero ready to to cancel mining quest!');
        }

        //If quests arent ready to complete return FALSE however if their ready to STOP return true
        return {
            canCancel: canBeCanceled
        };
    }

    public async cancelAllActiveMiningQuests() : Promise<void> {
        const walletsReadyToCancel = this.miningWalletsReadyForCancel.map((w) => w);

        if(walletsReadyToCancel && walletsReadyToCancel.length > 0) {
            //Make sure JEWEL is on the FIRST account in the list!
            console.log(`Checking the location of our jewel....`);
            const jewelHolderWallet = GenerateWalletsWorkFlow.instance.currentWallets?.find((x)=> { return x.jewelBalance != "0" });
            if(jewelHolderWallet) {
                //Ok we found the jewel.  Lets get the jewel moved to the FIRST wallet in the list ONLY IF its not already there!
                if(jewelHolderWallet.address != walletsReadyToCancel[0].address) {
                    const sourceWallet = await GenerateWalletsWorkFlow.instance.getTrueWallet(jewelHolderWallet);
                    const destinationWallet = await GenerateWalletsWorkFlow.instance.getTrueWallet(walletsReadyToCancel[0]);

                    console.log(`Jewl Found On => [Wallet:${sourceWallet.address}] => Moving it to => [Wallet:${destinationWallet.address}]`);

                    const sendJewelToFirstWalletInList = await this.transferLockedJewel(sourceWallet, destinationWallet);
                    if(!sendJewelToFirstWalletInList.success) {
                        //Failed to move jewel to the new wallet. Damn it, wtf is going on?  EXIT!
                        console.log(`Was unable to move the jewel to the first minable wallet! [Source:${sourceWallet.address}] => [Destination:${destinationWallet.address}] => Flow Terminated!`);
                        return;
                    } else {
                        console.log(`Jewel has been succesfully moved to the FIRST wallet! [Source:${sourceWallet.address}] => [Destination:${destinationWallet.address}] => Moving to quest cancellation!`);
                    }
                } else {
                    //Current wallet already the bag holder!
                    console.log(`Jewl Moved! => [Wallet:${walletsReadyToCancel[0].address}]`);
                }
            } else {
                //Unable to find the jewel wallet.  uh oh... wtf is it?
                console.log('UNABLE TO FIND WALLET HOLDING JEWEL.... Better check each wallet! => Flow Terminated!');
                return;
            }

            //const walletOnMiningQuest of walletsReadyToCancel
            for (var i=0; i<walletsReadyToCancel.length;i++) {
                const index = i;
                const walletOnMiningQuest = walletsReadyToCancel[index];
                let isLastWallet: boolean = false;

                if(index == walletsReadyToCancel.length-1) {
                    isLastWallet = true;
                }

                if (walletOnMiningQuest) {
                    const trueWalletOnMiningQuest = GenerateWalletsWorkFlow.instance.getTrueWallet(walletOnMiningQuest);

                    if (trueWalletOnMiningQuest) {
                        console.log(`Canceling Quest... [Wallet:${walletOnMiningQuest.name}] => [WalletAddress:${walletOnMiningQuest.address}] => [HeroId:${walletOnMiningQuest.assignedHero}]`);

                        const cancelQuestReceipt = await this.cancelQuest(trueWalletOnMiningQuest, walletOnMiningQuest.assignedHero!);
                        if(cancelQuestReceipt) {
                            console.log('Quest Canceled!')

                            //Set Local Data settings
                            const updWalletInfo = this.miningWalletsReadyForCancel.find(x=>x.privateKey === walletOnMiningQuest.privateKey);
                            if(updWalletInfo) {
                                walletOnMiningQuest.isOnQuest = false;
                                walletOnMiningQuest.questStartedAt = undefined;

                                //Save wallet updates
                                await GenerateWalletsWorkFlow.instance.saveCurrentWallets();
                            }

                            //Ok lets move the locked jewel to the NEXT wallet (if we are on the LAST wallet though we need to move it back to the FIRST wallet.)
                            let isLastWallet: boolean = false;
                            let destinationWallet: any;

                            try {
                                // Current wallet in loop the last ?
                                if(!isLastWallet) {
                                    // NO,  so what we gotta do is get the NEXT wallet in line
                                    const theNextWalletInLine = walletsReadyToCancel[index+1]; //Next wallet available in arroy

                                    //Set destination wallet as the NEXT wallet in line
                                    destinationWallet = GenerateWalletsWorkFlow.instance.getTrueWallet(theNextWalletInLine);
                                } else {
                                    //We are at the end of line. Last wallet in the loop!
                                    //Set destination back to the very FIRST wallet thats considered the source.
                                    const sourceWallet = GenerateWalletsWorkFlow.instance.currentWallets?.find(x=>x.isPrimarySourceWallet);
                                    if(sourceWallet) {
                                        //Found the source wallet.  Sent the jewel back!
                                        destinationWallet = GenerateWalletsWorkFlow.instance.getTrueWallet(sourceWallet);
                                    }
                                }
                            } catch (e) {
                                const sourceWallet = GenerateWalletsWorkFlow.instance.currentWallets?.find(x=>x.isPrimarySourceWallet);
                                if(sourceWallet) {
                                    //Found the source wallet.  Sent the jewel back!
                                    destinationWallet = GenerateWalletsWorkFlow.instance.getTrueWallet(sourceWallet);
                                }
                            }

                            console.log(`Moving Jewel To The Next Wallet => [FROM WALLET:${trueWalletOnMiningQuest.address}] => [TO WALLET:${destinationWallet.address}]`);

                            // Transfer the locked Jewel
                            const jewelXferReceipt = await this.transferLockedJewel(trueWalletOnMiningQuest, destinationWallet);
                            if(!jewelXferReceipt.success) {
                                console.log({ mode: 'error', error: `There was an error transfering locked jewel FROM=> [Wallet:${walletOnMiningQuest.address}] => TO => [Wallet:${destinationWallet.address}]. Process terminated.`});
                                break;
                            } else {
                                console.log(`Jewel was transferred => [IN WALLET:${destinationWallet.address}]`);
                            }

                        } else {
                            console.log({ mode: 'error', error: `There was an error canceling the mining quest for [Wallet:${walletOnMiningQuest.address}] [HeroId:${walletOnMiningQuest.assignedHero}]. Process terminated.`});
                        }
                    }
                }
            }
        }

        //Save wallet updates
        await GenerateWalletsWorkFlow.instance.saveCurrentWallets();
    }

    private async cancelQuest(wallet: Wallet, heroOnQuest: number) : Promise<boolean> {
        try {
            //Call the contract and wait for transaction to occur
            const tx = await this.questContract.connect(wallet)
                .cancelQuest(heroOnQuest, this.callOptions)

            let receipt = await tx.wait();

            if (receipt.status !== 1) {
                return false;
            } else {
                return true;
            }
        } catch (error) {
            console.log({mode: 'error', error});
        }

        return false;
    }

    private async startMiningQuest(wallet: Wallet, heroToMine: [number]) : Promise<{ success: boolean, receipt?: any, error?: any }> {
        try {
            let heroStamina = parseInt(await this.questContract.getCurrentStamina(heroToMine[0]));
            let heroActiveQuest = await this.questContract.getActiveQuests(wallet.address);

            // Make sure this hero isnt already on the mining quest!
            if(heroStamina >= config.heroSettings.minimumStaminaToDoQuest && heroActiveQuest.length == 0) {
                //Call the contract and wait for transaction to occur
                const tx = await this.questContract.connect(wallet)
                    .startQuest(heroToMine, config.availableQuests.mining.address, 1, this.callOptions);

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
             }
        } catch (err) {
            console.log({mode: 'error', error: err});

            return {
                success: false,
                error: err
            }
        }

        return {
            success: false
        }
    }

    public async transferLockedJewel(sourceWallet: Wallet, destinationWallet: Wallet) : Promise<{ success: boolean, receipt?: any }> {
        try{
            if(sourceWallet.address === destinationWallet.address) {
                //NEVER EVER SEND TO SELF!!!
                return {
                    success: false
                };
            }

            //Call the contract and wait for transaction to occur
            const tx = await this.jewelContract.connect(sourceWallet)
                .transferAll(destinationWallet.address);

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
        } catch (err) {
            console.log({mode: 'error', error: err});
        }

        return {
            success: false
        }
    }

    private millisToMinutesAndSeconds(millis: any) {
        var minutes: any = Math.floor(millis / 60000);
        var seconds: any = ((millis % 60000) / 1000).toFixed(0);
        return minutes + "min:" + (seconds < 10 ? '0' : '') + seconds + 's';
    }
}