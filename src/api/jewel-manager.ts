import {IWallet} from "../interfaces/wallet/interface-wallet";
import TrueWallet from "./true-wallet";
import {Wallet} from "ethers";

const ethers = require("ethers");
const config = require('../../config.json');

const jewelAbi = require("../../abis/jewel-token-abi.json");

export default class JewelManager {
    private provider: any;
    private callOptions = {gasPrice: config.transactionSettings.gasPrice, gasLimit: config.transactionSettings.gasLimit};

    public get jewelContract() : any {
        return new ethers.Contract(
            config.contracts.jewelToken.address,
            jewelAbi,
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

    public async transferLockedJewel(sourceWallet: IWallet, destinationAddress: string) : Promise<{ success: boolean, receipt?: any, error?: any }> {
        try{
            if(sourceWallet.address?.trim().toUpperCase() === destinationAddress.trim().toUpperCase()) {
                //NEVER EVER SEND TO SELF!!!
                return {
                    success: false,
                    error: 'Tried sending to the same address!'
                };
            }

            //Call the contract and wait for transaction to occur
            const tx = await this.jewelContract.connect(new TrueWallet(sourceWallet.privateKey!).getTrueWallet()).transferAll(destinationAddress)

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