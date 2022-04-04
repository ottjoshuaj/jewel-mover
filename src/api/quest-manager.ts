import {IWallet} from "../interfaces/wallet/interface-wallet";
import TrueWallet from "./true-wallet";
import ProviderSingleton from "./provider-singleton";

const ethers = require("ethers");
const config = require('../../config.json');

const questAbi = require("../../abis/dfk-quests.json");

export default class QuestManager {
    private static _instance: QuestManager;
    private _contract: any;

    private callOptions = {
        gasPrice: config.transactionSettings.gasPrice,
        gasLimit: config.transactionSettings.gasLimit
    };

    constructor() {
        this._contract = new ethers.Contract(
            config.contracts.quest.address,
            questAbi,
            ProviderSingleton.instance.provider
        );
    }

    public static get instance() {
        this._instance = this._instance || new this();
        return this._instance;
    }

    public async startQuest(wallet: IWallet, heroToMine: [number]): Promise<{ success: boolean, receipt?: any, error?: any }> {
        try {
            const tx = await this._contract.connect(TrueWallet.instance.getWallet(wallet.privateKey!))
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
                    success: true,
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
            const tx = await this._contract.connect(TrueWallet.instance.getWallet(wallet.privateKey!)).completeQuest(heroOnQuest, this.callOptions)

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
            const tx = await this._contract.connect(TrueWallet.instance.getWallet(wallet.privateKey!)).cancelQuest(heroOnQuest, this.callOptions)

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