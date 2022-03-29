import {IWallet} from "../interfaces/wallet/interface-wallet";
import TrueWallet from "./true-wallet";

const ethers = require("ethers");
const config = require('../../config.json');

const questAbi = require("../../abis/dfk-quests.json");

export default class QuestManager {
    private provider: any;
    private callOptions = {
        gasPrice: config.transactionSettings.gasPrice,
        gasLimit: config.transactionSettings.gasLimit
    };

    public get questContract(): any {
        return new ethers.Contract(
            config.contracts.quest.address,
            questAbi,
            this.provider
        );
    }

    constructor() {
        //Setup provider and contracts
        if (config.rpc.mode === "websocket")
            this.provider = new ethers.providers.WebSocketProvider(config.rpc.websocket.urls[0]);
        else {
            this.provider = new ethers.providers.JsonRpcProvider(config.rpc.https.urls[0]);
        }
    }

    public async startQuest(wallet: IWallet, heroToMine: [number]): Promise<{ success: boolean, receipt?: any, error?: any }> {
        try {
            const tx = await this.questContract.connect(new TrueWallet(wallet.privateKey!).getTrueWallet())
                .startQuest(heroToMine, config.availableQuests.mining.address, 1, this.callOptions);

            let receipt = await tx.wait();

            if (receipt.status !== 1) {
                return {
                    success: false,
                    receipt,
                    error: null
                };
            } else {
                return {
                    success: false,
                    receipt,
                    error: null
                };
            }
        } catch (err) {
            console.log({mode: 'error', error: err});

            return {
                success: false,
                receipt: null,
                error: err
            }
        }
    }

    public async completeQuest(wallet: IWallet, heroOnQuest: number): Promise<{ success: boolean, receipt?: any, error?: any }> {
        try {
            const tx = await this.questContract.connect(new TrueWallet(wallet.privateKey!).getTrueWallet()).completeQuest(heroOnQuest, this.callOptions)

            let receipt = await tx.wait();

            if (receipt.status !== 1) {
                return {
                    success: false,
                    receipt,
                    error: null
                }
            } else {
                return {
                    success: true,
                    receipt,
                    error: null
                }
            }
        } catch (err) {
            console.log({mode: 'error', error: err});

            return {
                success: false,
                receipt: null,
                error: err
            }
        }
    }

    public async cancelQuest(wallet: IWallet, heroOnQuest: number): Promise<{ success: boolean, receipt?: any, error?: any }> {
        try {
            const tx = await this.questContract.connect(new TrueWallet(wallet.privateKey!).getTrueWallet()).cancelQuest(heroOnQuest, this.callOptions)

            let receipt = await tx.wait();

            if (receipt.status !== 1) {
                return {
                    success: false,
                    receipt,
                    error: null
                }
            } else {
                return {
                    success: true,
                    receipt,
                    error: null
                }
            }
        } catch (err) {
            console.log({mode: 'error', error: err});

            return {
                success: false,
                receipt: null,
                error: err
            }
        }
    }
}