import {IWallet} from "../interfaces/wallet/interface-wallet";
import TrueWallet from "./true-wallet";

const ethers = require("ethers");
const config = require('../../config.json');

const heroAbi = require("../../abis/dfk-hero.json");

export default class HeroManager {
    private provider: any;
    private callOptions = {gasPrice: config.transactionSettings.gasPrice, gasLimit: config.transactionSettings.gasLimit};

    public get heroContract() : any {
        return new ethers.Contract(
            config.contracts.hero.address,
            heroAbi,
            this.provider
        );
    }

    constructor() {
        //Setup provider and contracts
        if(config.rpc.mode === "websocket")
            this.provider = new ethers.providers.WebSocketProvider(config.rpc.websocket.urls[0]);
        else {
            this.provider = new ethers.providers.JsonRpcProvider(config.rpc.https.urls[0]);
        }
    }

    public async transferHeroToWallet(sourceWallet: IWallet, destinationAddress: string, heroId: number) : Promise<{ success: boolean, receipt?: any, error?: any }> {
        try {
            const tx = await this.heroContract.connect(new TrueWallet(sourceWallet.privateKey!).getTrueWallet()).transferFrom(
                sourceWallet.address,
                destinationAddress,
                heroId,
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