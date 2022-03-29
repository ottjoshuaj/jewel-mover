import {Wallet} from "ethers";
import {IWallet} from "../interfaces/wallet/interface-wallet";

const Web3 = require('web3');
const BN = require('bn.js');

const ethers = require("ethers");
const config = require('../../config.json');

export default class TrueWallet {
    private provider: any;
    private wallet?: Wallet;

    constructor(privateKey?: string) {
        if(config.rpc.mode === "websocket")
            this.provider = new ethers.providers.WebSocketProvider(config.rpc.websocket.urls[0]);
        else {
            this.provider = new ethers.providers.JsonRpcProvider(config.rpc.https.urls[0]);
        }

        if(privateKey) {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
        }
    }

    public getTrueWallet() : Wallet {
        return this.wallet!;
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