import {IWallet} from "../interfaces/wallet/interface-wallet";
import TrueWallet from "./true-wallet";

const ethers = require("ethers");
const config = require('../../config.json');

const profileAbi = require("../../abis/dfk-profile.json");

export default class ProfileManager {
    private static _instance: ProfileManager;
    private provider: any;
    private callOptions = {
        gasPrice: config.transactionSettings.gasPrice,
        gasLimit: config.transactionSettings.gasLimit
    };

    public get profileContract(): any {
        return new ethers.Contract(
            config.contracts.profile.address,
            profileAbi,
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

    public static get instance() {
        this._instance = this._instance || new this();
        return this._instance;
    }

    public async onBoardWalletToDefiKingdoms(wallet: IWallet): Promise<{ success: boolean, receipt?: any, error?: any }> {
        try {
            const tx = await this.profileContract.connect(TrueWallet.instance.getWallet(wallet.privateKey!))
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