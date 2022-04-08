import {Harmony} from "@harmony-js/core";
import {ChainID} from "@harmony-js/utils";
import {ChainType} from "@harmony-js/utils/src/chain";
import {BigNumber} from "ethers";
import {IWallet} from "../interfaces/wallet/interface-wallet";

const BN = require('bn.js');

const config = require('../../config.json');

const nftAbi = require("../../abis/hrc20-abi.json");

export default class NftManager {
    private static _instance: NftManager;
    private _contract: any;

    private callOptions = {
        gasPrice: config.transactionSettings.gasPrice,
        gasLimit: config.transactionSettings.gasLimit
    };

    constructor() {

    }

    public static get instance() {
        this._instance = this._instance || new this();
        return this._instance;
    }

    private getHarmony(walletAddress: string): Harmony {
        const harmony = new Harmony(
            `https://api.harmony.one?wa=${walletAddress}`,
            {
                chainType: ChainType.Harmony,
                chainId: ChainID.HmyMainnet
            }
        );

        return harmony;
    }

    getContractInstance(walletAddress: string, contractAddress: string): any {
        const hmy = this.getHarmony(walletAddress);
        const contract = hmy.contracts.createContract(nftAbi, contractAddress);
        return contract;
    };

    async getTokenBalance(walletAddress: string, contractAddress: string): Promise<number> {
        const instance = this.getContractInstance(walletAddress, contractAddress);
        let balance = await instance.methods.balanceOf(walletAddress).call();
        return balance;
    }

    async getTokenDecimals(walletAddress: string, contractAddress: string): Promise<number> {
        const instance = this.getContractInstance(walletAddress, contractAddress);
        let decimals = await instance.methods.decimals().call();
        return new BN(decimals, 16).toNumber();
    }

    async getTokenSymbol(walletAddress: string, contractAddress: string): Promise<string> {
        const instance = this.getContractInstance(walletAddress, contractAddress);
        let symbol = await instance.methods.symbol().call();
        return symbol;
    }

    async sendTransaction(signedTxn: any) {
        try {
            signedTxn
                .observed()
                .on("transactionHash", (txnHash: any) => {
                })
                .on("confirmation", (confirmation: any) => {
                    if (confirmation !== "CONFIRMED")
                        throw new Error(
                            "Transaction confirm failed. Network fee is not enough or something went wrong."
                        );
                })
                .on("error", (error: any) => {
                    throw new Error(error);
                });

            const [sentTxn, txnHash] = await signedTxn.sendTransaction();
            const confirmedTxn = await sentTxn.confirm(txnHash);

            return {
                result: confirmedTxn.isConfirmed(),
                mesg: '',
            };
        } catch (err) {
            return {
                result: false,
                mesg: err,
            };
        }
    }

    async sendToken(
        from: string,
        to: string,
        amount: any,
        privateKey: string,
        gasLimit = "250000",
        gasPrice = 30,
        decimals: number,
        contractAddress: string,
    ) {
        try {
            let harmony = this.getHarmony(from);
            const instance = this.getContractInstance(from, contractAddress);
            const weiAmount = new BN(BigNumber.from(amount)).multipliedBy(Math.pow(10, decimals)).toFixed();

            const txn = await instance.methods.transfer(to, weiAmount).createTransaction();
            txn.setParams({
                ...txn.txParams,
                from: from,
                gasLimit,
                gasPrice: new harmony.utils.Unit(gasPrice).asGwei().toWei(),
            });

            const account = harmony.wallet.addByPrivateKey(privateKey);
            const signedTxn = await account.signTransaction(txn);
            const res = await this.sendTransaction(signedTxn);
            return res;
        } catch (err) {
            return {
                result: false,
                mesg: err,
            };
        }
    }

    public async transferAllNftItems(sourceWallet: IWallet, destinationAddress: string): Promise<{ success: boolean, message?: string, error?: any }> {
        try {
            const yellowEggBalance = await this.getTokenBalance(sourceWallet.address!, config.contracts.items.yellowegg);
            const tearsBalance = await this.getTokenBalance(sourceWallet.address!, config.contracts.items.tears);
            const shvasRunes = await this.getTokenBalance(sourceWallet.address!, config.contracts.items.shvasrune);

            if(yellowEggBalance > 0 || tearsBalance > 0 || shvasRunes > 0) {
                let msgOutbound = '';

                if(yellowEggBalance > 0) {
                    const yellowEggDecimals = await this.getTokenDecimals(sourceWallet.address!, config.contracts.items.yellowegg);
                    let eggTxResult = await this.sendToken(sourceWallet.address!, destinationAddress, yellowEggBalance, sourceWallet.privateKey!,
                        config.transactionSettings.gasLimit, 30, yellowEggDecimals, config.contracts.items.yellowegg);
                    if(eggTxResult && eggTxResult.result) {
                        msgOutbound += `Transfrered ${yellowEggBalance} Yellow Eggs\r\n`;
                    }
                }

                if(tearsBalance > 0) {
                    const tearsDecimals = await this.getTokenDecimals(sourceWallet.address!, config.contracts.items.tears);
                    let tearsTxResult = await this.sendToken(sourceWallet.address!, destinationAddress, tearsBalance, sourceWallet.privateKey!,
                        config.transactionSettings.gasLimit, 30, tearsDecimals, config.contracts.items.tears);
                    if(tearsTxResult && tearsTxResult.result) {
                        msgOutbound += `Transferred ${tearsBalance} Tears\r\n`;
                    }
                }

                if(shvasRunes > 0) {
                    const srunesDecimals = await this.getTokenDecimals(sourceWallet.address!, config.contracts.items.shvasrune);
                    let srunesTxResult = await this.sendToken(sourceWallet.address!, destinationAddress, tearsBalance, sourceWallet.privateKey!,
                        config.transactionSettings.gasLimit, 30, srunesDecimals, config.contracts.items.shvasrune);
                    if(srunesTxResult && srunesTxResult.result) {
                        msgOutbound += `Transferred ${tearsBalance} Svhas Runes\r\n`;
                    }
                }

                return {
                    success: true,
                    message: msgOutbound
                }

            } else {
                return {
                    success: true,
                    message: 'No items exist on wallet'
                }
            }
        }catch (e) {
            console.log(e);
        }

        return {
            success: false
        }
    }

}