import promptSync from 'prompt-sync';
import GenerateWalletsWorkFlow from "./classes/works-flows/generate-wallets-work-flow";
import SystemMenus from "./classes/menus/system-menus";
import QuestingWorkFlow from "./classes/works-flows/questing-work-flow";

const config = require('../config.json');

const sysMenus = new SystemMenus();
const prompt = promptSync();

let firstLoad = true;

//Stamina ...if hero has enough stamina, SEND ON QUEST.
//Re-Add WAIT FOR TX for Jewel Xfer and Send Quest/Cancel Quest
//List all Jewel in wallet

const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function startApp() {
    if(firstLoad) {
        await GenerateWalletsWorkFlow.instance.init();
        firstLoad = false;
    }

    //Draw first instance of menu to screen
    sysMenus.writeMainMenuToScreen();

    try {
        switch (prompt("Selection: ").toUpperCase()) {
            case "X":
                process.exit();
                break;
            case "DELETE": //Clear all wallets
                if(prompt("Are you sure you want to clear all wallets? [Y/n]: ").toUpperCase() === "Y" || "") {
                    //await GenerateWalletsWorkFlow.instance.clearAllWallets();

                    //sysMenus.writeMsgToScreen('All wallets have been removed!');
                }

                await startApp();
                break;
            case "M":
                const srcWalletAddress = prompt("Source Wallet Address: ");
                const destWalletAddress = prompt("Destination Wallet Address: ");

                if(srcWalletAddress && destWalletAddress) {
                    const moveJewelFlow = new QuestingWorkFlow();
                    const sourceWallet = GenerateWalletsWorkFlow.instance.currentWallets?.find(x=>x.address == srcWalletAddress);
                    const desinationWallet = GenerateWalletsWorkFlow.instance.currentWallets?.find(x=>x.address == destWalletAddress);

                    if(sourceWallet && desinationWallet) {
                        const wallet1 = GenerateWalletsWorkFlow.instance.getTrueWallet(sourceWallet);
                        const wallet2 = GenerateWalletsWorkFlow.instance.getTrueWallet(desinationWallet);

                        if(wallet1 && wallet2) {
                            const moveResult = await moveJewelFlow.transferLockedJewel(wallet1, wallet2);
                            if(moveResult.success) {
                                sysMenus.writeMsgToScreen('=====================================================================================================================');
                                sysMenus.writeMsgToScreen(`All locked jewel in wallet => ${wallet1.address} has been moved to wallet => ${wallet2.address}`);
                                sysMenus.writeMsgToScreen('=====================================================================================================================');
                            } else {
                                sysMenus.writeMsgToScreen('Failed to move locked jewel!');
                            }
                        }
                        else {
                            sysMenus.writeMsgToScreen('Unable to load wallets. Check both wallets addresses and try again. (Make sure their in the wallets datafile too!)');
                        }
                    } else {
                        sysMenus.writeMsgToScreen('Unable to load wallets. Check both wallets addresses and try again. (Make sure their in the wallets datafile too!)');
                    }

                } else {
                    sysMenus.writeMsgToScreen('You must provide a valid addresses for source and destination wallets!');
                }

                await startApp();
                break;
            case "INIT":
                await GenerateWalletsWorkFlow.instance.menuInit();
                await startApp();
                break;
            case "1":
                const genWalletsChoice = prompt("How many new wallets do you want to create? [Must be a number!]: ");
                if (Number(genWalletsChoice) > 0) {
                    const flowResult = await GenerateWalletsWorkFlow.instance.generateWallets(Number(genWalletsChoice));
                    if (flowResult.success) {
                        sysMenus.writeMsgToScreen(`[${flowResult.newWallets?.length}] Wallets Generated.`);
                    } else {
                        sysMenus.writeMsgToScreen(`Error Generating Wallets, But still created => [${flowResult.newWallets?.length}] Wallets Generated.`);
                    }
                } else {
                    sysMenus.writeMsgToScreen('Invalid number choice')
                }

                await startApp();
                break;
            case "2":
                sysMenus.writeMsgToScreen('You are adding a existing wallet to this system. Make sure to have all required info ready!');
                sysMenus.writeMsgToScreen('Note: If you do not have the public/private keys, provide the address AND Mnemonic words.');
                sysMenus.writeMsgToScreen('      And leave the public/private keys empty.');
                sysMenus.writeMsgToScreen('====================================================================================')

                const walletName = prompt("What name would you like to call this wallet?");
                if(walletName) {
                    //Check to ensure we dont have a wallet called this already.
                    if(GenerateWalletsWorkFlow.instance.currentWallets?.find(x=>x.name === walletName)) {
                        sysMenus.writeMsgToScreen(`There is already a wallet called: ${walletName}.  Please start process over and choose a different name!`);
                    } else {
                        const walletAddress = prompt("Wallet ERC20 Address: ");
                        const walletPrivateKey = prompt("Wallet Private Key: ");
                        const walletPublicKey = prompt("Wallet Private Key: ");
                        const walletWords = prompt("Wallet Words (Mnemonic): ");
                        const walletIsPrimarySource = prompt("Will this wallet fund all other wallets? (Primary Funding Wallet) [Y/n] ").toUpperCase() === "Y" || "" ? true : false;

                        if(walletAddress && ((walletPrivateKey && walletPublicKey) || walletWords)) {
                            await GenerateWalletsWorkFlow.instance.addManualWallet(walletName, walletAddress, walletPublicKey, walletPrivateKey, walletWords, walletIsPrimarySource);
                            sysMenus.writeMsgToScreen('Wallet has been added to wallet list.');
                        } else {
                            sysMenus.writeMsgToScreen('You must provide an address and either private/public keys OR the Mnemonic words. Try again.');
                        }
                    }
                }

                await startApp();
                break;
            case "3":
                sysMenus.writeMsgToScreen('Current Available Wallets: (Loading...please wait...');
                sysMenus.writeMsgToScreen('====================================================================================')

                if(GenerateWalletsWorkFlow.instance.currentWallets) {
                    //Re-Build / Populate Jewel
                    await GenerateWalletsWorkFlow.instance.loadJewelBalances(true, true);

                    const allWallets = await GenerateWalletsWorkFlow.instance.getAllWallets();
                    for (const wallet of allWallets) {
                        sysMenus.writeMsgToScreen(`[KEY: ${wallet.keyId}] [Address:${wallet.address}] => [Name: ${wallet.name}] => [ONE Balance:${wallet.currentBalance}]:[Locked-Jewel Balance:${wallet.jewelBalance}] [Assigned HeroId:${wallet.assignedHero}] [Is On Quest: ${wallet.isOnQuest}]`);
                    }
                } else {
                    sysMenus.writeMsgToScreen('There are currently no wallets available. Try generating some or manually adding them.');
                }

                await startApp();
                break;
            case "4":
                sysMenus.writeMsgToScreen('Setting a wallet as primary funding is CRUCIAL as all the other wallets needs funds!');
                sysMenus.writeMsgToScreen('Make sure to LIST the wallets first and use the [keyId] value as the value below!!!!');
                sysMenus.writeMsgToScreen('====================================================================================');

                const markAsSourceWalletPrompt = prompt('What wallet keyId to mark as primary funding wallet: ');
                if(markAsSourceWalletPrompt) {
                    const walletOfKeyId = GenerateWalletsWorkFlow.instance.currentWallets?.find(x=>x.keyId === Number(markAsSourceWalletPrompt));
                    if(walletOfKeyId) {
                        await GenerateWalletsWorkFlow.instance.markWalletAsPrimarySource(Number(markAsSourceWalletPrompt))

                        sysMenus.writeMsgToScreen(`[KeyId:${walletOfKeyId}] => Wallet Address: ${walletOfKeyId.address} has been marked as funding source wallet!`)
                    } else {
                        sysMenus.writeMsgToScreen(`[KeyId:${walletOfKeyId}] does NOT exist!`);
                    }
                } else {
                    sysMenus.writeMsgToScreen('You must provide a keyId! Try again!');
                }

                await startApp();
                break;
            case "5": //Fund all wallets
                sysMenus.writeMsgToScreen('====================================================================================');
                sysMenus.writeMsgToScreen('You are about to fund all wallets from your source wallet.');
                sysMenus.writeMsgToScreen('Make sure you have enough ONE token in your source wallet to do this!');
                sysMenus.writeMsgToScreen('====================================================================================');

                const fundsPerWallet = prompt("How much ONE to send to each wallet? (WHOLE NUMBER ONLY): ");
                if(Number(fundsPerWallet)) {
                    const fundResult = await GenerateWalletsWorkFlow.instance.fundWallets(Number(fundsPerWallet));
                    if(fundResult) {
                        sysMenus.writeMsgToScreen('All wallets have been funded!');
                        sysMenus.writeMsgToScreen('====================================================================================')
                    } else {
                        sysMenus.writeMsgToScreen('Wallet funding failed.  Check the log for an error!');
                        sysMenus.writeMsgToScreen('====================================================================================')
                    }
                } else {
                    sysMenus.writeMsgToScreen('The value you provided was NOT a whole number. Try again!');
                }

                await startApp();
                break;
            case "6": // List all heroes in all wallets
                sysMenus.writeMsgToScreen('====================================================================================')
                sysMenus.writeMsgToScreen('Building Wallet Heroes list...')
                sysMenus.writeMsgToScreen('====================================================================================')

                //Build a full proper READONLY list of heroes
                await GenerateWalletsWorkFlow.instance.buildProperHeroListForWallets();

                for (const wallet of GenerateWalletsWorkFlow.instance.currentWallets!) {
                    console.log({ wallet: wallet.address, assignedHero: wallet.assignedHero ?? 'none', heroes: wallet.availableHeroes?.heroes ?? 'none' })
                }

                sysMenus.writeMsgToScreen('====================================================================================')

                await startApp();
                break;
            case "7": //Send heroes to all wallets
                sysMenus.writeMsgToScreen('====================================================================================')
                sysMenus.writeMsgToScreen('Building Wallet Heroes list...')
                sysMenus.writeMsgToScreen('====================================================================================')

                //Build a full proper READONLY list of heroes
                await GenerateWalletsWorkFlow.instance.buildProperHeroListForWallets();

                //Check how many wallets we have,  make sure we have enough heroes
                sysMenus.writeMsgToScreen('====================================================================================');
                sysMenus.writeMsgToScreen('Sending Heroes to all wallets from source wallet...');
                sysMenus.writeMsgToScreen('====================================================================================');

                const sourceWallet = await GenerateWalletsWorkFlow.instance.currentWallets!.find(x=>x.isPrimarySourceWallet);
                if(sourceWallet && sourceWallet.availableHeroes?.heroes) {
                    //There is a source wallet & there are heroes available!
                    //Check how many wallets we have in our list and make sure there is enough heroes for them!
                    const availableHeroes = sourceWallet.availableHeroes?.heroes.filter((v) => {
                        return v != sourceWallet.assignedHero!;
                    });

                    const totalHeroesAvailable = availableHeroes.length;
                    if(totalHeroesAvailable >= GenerateWalletsWorkFlow.instance.currentWallets!.filter((w) => { w.address != sourceWallet.address }).length) {
                        //We have enough heroes in our source wallet to send to each wallet.
                        for (const destinationWallet of GenerateWalletsWorkFlow.instance.currentWallets?.filter((v,i,a) => v.isPrimarySourceWallet == false)!) {
                            //Does desingation wallet already have a hero? is it assigned?
                            const destinationWalletHeroList = await GenerateWalletsWorkFlow.instance.getAllHeroesByWallet(destinationWallet);

                            if(destinationWalletHeroList && destinationWalletHeroList.length > 0) {
                                //Destination wallet already has an assigned hero. No need to re-assign
                                sysMenus.writeMsgToScreen(`Wallet Already Had A Hero! => [HeroId:${destinationWallet.assignedHero}] => FROM => [Wallet:${sourceWallet.address}] => TO => [Wallet:${destinationWallet.address}]`);
                            } else {
                                //Wallet doesnt NOT have a list of available heroes
                                const sendHero = availableHeroes.pop(); //Take last hero in array and shift it up

                                if(sendHero) {
                                    sysMenus.writeMsgToScreen(`Transfering [HeroId:${sendHero}] => FROM => [Wallet:${sourceWallet.address}] => TO => [Wallet:${destinationWallet.address}] ==> Can take a few min based on blockchain speed...`);
                                    const heroXferResult = await GenerateWalletsWorkFlow.instance.transferHeroToWallet(sourceWallet, destinationWallet, sendHero);
                                    if(heroXferResult) {
                                        sysMenus.writeMsgToScreen(`Transfered [HeroId:${sendHero}] => FROM => [Wallet:${sourceWallet.address}] => TO => [Wallet:${destinationWallet.address}]`);
                                        destinationWallet.assignedHero = sendHero;
                                    } else {
                                        sysMenus.writeMsgToScreen(`FAILED to Transfer [HeroId:${sendHero}] => FROM => [Wallet:${sourceWallet.address}] => TO => [Wallet:${destinationWallet.address}]`);
                                    }
                                }
                            }

                            GenerateWalletsWorkFlow.instance.saveCurrentWallets();
                        }

                        sysMenus.writeMsgToScreen('Done!');

                    } else {
                        sysMenus.writeMsgToScreen(`There are not enough available heroes in source wallet. [Wallets:${GenerateWalletsWorkFlow.instance.currentWallets?.length!-1}] => [Heroes Needed:${GenerateWalletsWorkFlow.instance.currentWallets?.length!-1} / Available: ${totalHeroesAvailable}]`);
                    }

                } else {
                    //No Source Wallet
                    sysMenus.writeMsgToScreen('There is no source wallet set! You must set a source wallet first!');
                }

                await startApp();
                break;
            case "8": //Start questing all setup wallets w/ heroes
                //TODO: Make sure we have wallets!
                //Lets MAke sure Jewel is in main wallet
                await GenerateWalletsWorkFlow.instance.loadJewelBalances(true, true);
                await GenerateWalletsWorkFlow.instance.ensureJewelIsOnSourceWallet(true);

                console.log('Complete.')

                await foreverFlow(new QuestingWorkFlow());
                break;
        }
    } catch (e) {
        console.log({status: 'AppError', error: e});
    }
}



async function foreverFlow(questFlow: QuestingWorkFlow) {
    sysMenus.writeMsgToScreen('=====================================================================================================================');
    sysMenus.writeMsgToScreen(`${new Date()} - Autonomus QuestBot Running....`);

    //Are there any active quests right now?
    if(await GenerateWalletsWorkFlow.instance.checkForWalletsOnQuests()) {
        sysMenus.writeMsgToScreen('Checking all active mining wallets to see if its time to cancel any mining quests....');

        const isReadyToCancelQuests = await questFlow.checkQuestStatuses();
        if(isReadyToCancelQuests.canCancel) {
            //Cancel all mining quests
            await questFlow.cancelAllActiveMiningQuests();

            await sleep(5000);
        } else {
            sysMenus.writeMsgToScreen(`[No Wallets Ready For Quest Cancel] => Will check again in ${config.questSettings.checkForQuestStatusAfterMilliseconds}ms`);
        }

        // Attempt to quest if there are wallets NOT mining
        if(questFlow.mineableWallets.length > 0) {
            sysMenus.writeMsgToScreen(`${new Date()} - IDLE Mineable wallets are available....Starting Quest Flow for them....`);

            await attemptToQuest(questFlow);
        }

        await setTimeout(() => foreverFlow(questFlow), config.questSettings.checkForQuestStatusAfterMilliseconds);
    } else {
        await attemptToQuest(questFlow, true);
    }

    sysMenus.writeMsgToScreen('=====================================================================================================================');
}

async function attemptToQuest(questFlow: QuestingWorkFlow, enableTimers?: boolean) {
    sysMenus.writeMsgToScreen(`Checking available stamina of heroes. All mineable wallets must have a hero with 15+ stamina!...`);

    //No active quests.  Lets check hero stamina and if we have enough start questing
    if(await questFlow.checkWalletsForStamina()) {
        //Last wallet has enough stamina...so that means so does the others
        sysMenus.writeMsgToScreen(`Wallets found with stamina...Sending them questing...`);

        //restart all quests
        const questResult = await questFlow.startQuesting();
        if(questResult > 0) {
            if(enableTimers)
                await setTimeout(() => foreverFlow(questFlow), config.questSettings.checkForQuestStatusAfterMilliseconds);
        }
    } else {
        sysMenus.writeMsgToScreen(`Heroes in wallets not mining do not have enough stamina!... Will check again in ${config.questSettings.checkForQuestStatusAfterMilliseconds}ms => Monitoring Wallets thats mining again....`);

        if(enableTimers)
            await setTimeout(() => foreverFlow(questFlow), config.questSettings.checkForQuestStatusAfterMilliseconds);
    }
}



//Start initial app process
startApp()

/*
Notes: https://github.com/0rtis/dfk/blob/master/quest/quest_core.py
 */