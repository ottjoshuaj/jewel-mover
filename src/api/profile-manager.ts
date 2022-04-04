import {IWallet} from "../interfaces/wallet/interface-wallet";
import TrueWallet from "./true-wallet";
import ProviderSingleton from "./provider-singleton";

const ethers = require("ethers");
const config = require('../../config.json');

const profileAbi = require("../../abis/dfk-profile.json");

export default class ProfileManager {
    private static _instance: ProfileManager;
    private provider: any;
    private _contract: any;

    private callOptions = {
        gasPrice: config.transactionSettings.gasPrice,
        gasLimit: config.transactionSettings.gasLimit
    };

    constructor() {
        this._contract = new ethers.Contract(
            config.contracts.profile.address,
            profileAbi,
            this.provider
        );
    }

    public static get instance() {
        this._instance = this._instance || new this();
        return this._instance;
    }

    public async onBoardWalletToDefiKingdoms(wallet: IWallet): Promise<{ success: boolean, receipt?: any, error?: any }> {
        try {
            const tx = await this._contract.connect(TrueWallet.instance.getWallet(wallet.privateKey!))
                .createProfile(
                    wallet.name,
                    0,
                    0,
                    this.callOptions
                );

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