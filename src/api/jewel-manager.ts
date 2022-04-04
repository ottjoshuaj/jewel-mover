import {IWallet} from "../interfaces/wallet/interface-wallet";
import TrueWallet from "./true-wallet";
import {ContractInterface, Wallet} from "ethers";
import ProviderSingleton from "./provider-singleton";

const ethers = require("ethers");
const config = require('../../config.json');

const jewelAbi = require("../../abis/jewel-token-abi.json");

export default class JewelManager {
    private static _instance: JewelManager;
    private _contract: any;

    constructor() {
        this._contract = new ethers.Contract(
            config.contracts.jewelToken.address,
            jewelAbi,
            ProviderSingleton.instance.provider
        );
    }

    public static get instance() {
        this._instance = this._instance || new this();
        return this._instance;
    }

    public async transfer(sourceWallet: IWallet, destinationAddress: string, amount: any): Promise<{ success: boolean, receipt?: any, error?: any }> {
        try{
            if(sourceWallet.address?.trim().toUpperCase() === destinationAddress.trim().toUpperCase()) {
                //NEVER EVER SEND TO SELF!!!
                return {
                    success: false,
                    error: 'Tried sending to the same address!'
                };
            }

            //Call the contract and wait for transaction to occur
            const tx = await this._contract.connect(TrueWallet.instance.getWallet(sourceWallet.privateKey!)).transfer(destinationAddress, amount)

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
            const tx = await this._contract.connect(TrueWallet.instance.getWallet(sourceWallet.privateKey!)).transferAll(destinationAddress)

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