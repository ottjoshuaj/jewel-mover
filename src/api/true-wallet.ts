import {Wallet} from "ethers";
import {IWallet} from "../interfaces/wallet/interface-wallet";
import ProviderSingleton from "./provider-singleton";

const Web3 = require('web3');
const BN = require('bn.js');

const ethers = require("ethers");
const config = require('../../config.json');

export default class TrueWallet {
    private static _instance: TrueWallet;
    //private wallets?: [Wallet];

    public static get instance() {
        this._instance = this._instance || new this();
        return this._instance;
    }

    public getWallet(privateKey: string) : Wallet {
        return new ethers.Wallet(privateKey, ProviderSingleton.instance.provider);
        /*
        let foundWallet = this.wallets?.find(x=>x.privateKey === privateKey);
        if(foundWallet) {
            return foundWallet;
        } else {
            foundWallet = new ethers.Wallet(privateKey, this.provider);

            if(this.wallets)
                 this.wallets.push(foundWallet!);
            else
                this.wallets = [foundWallet!];

            return foundWallet!;
        }*/
    }

    public async sendOneToWallet(sourceWallet: IWallet, destinationAddress: string, amountOfOneToSend: number) : Promise<{  success: boolean, balance?: string, receipt?: any }> {
        try {
            const web3 = new Web3(config.rpc.https.urls[0]);

            let hmyMasterAccount = web3.eth.accounts.privateKeyToAccount(sourceWallet.privateKey!);
            web3.eth.accounts.wallet.add(hmyMasterAccount);
            web3.eth.defaultAccount = hmyMasterAccount.address

            let nonce = await web3.eth.getTransactionCount(sourceWallet.address!);

            const gasPrice = new BN(await web3.eth.getGasPrice()).mul(new BN(1));
            const gasLimit = 6721900;

            const value = amountOfOneToSend * 1e18; // 1 ONE

            const from = web3.eth.defaultAccount;
            const to = destinationAddress;

            const result = await web3.eth
                .sendTransaction({ from, to, value, nonce: nonce++, gasPrice, gasLimit });

            const newAddrBalance: any = await web3.eth.getBalance(destinationAddress);

            if (result && result.status) {
                return {
                    success: true,
                    balance: `${newAddrBalance / 1e18}`,
                    receipt: result
                };
            } else {
                return {
                    success: false,
                    receipt: result
                };
            }
        } catch (e) {
            console.log({ section: 'sendOneToWallet', error: e });
        }

        return {
            success: false
        };
    }
}