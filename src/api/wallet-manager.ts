import {IWallet} from "../interfaces/wallet/interface-wallet";
import CryptoWallet from "../classes/wallet/crypto-wallet";

export default class WalletManager {
    private static _instance: WalletManager;
    private cryptoWallet: CryptoWallet;

    constructor() {
        this.cryptoWallet = new CryptoWallet();
    }

    public static get instance() {
        this._instance = this._instance || new this();
        return this._instance;
    }

    public async createWallet(name: string): Promise<{ success: boolean, wallet: IWallet } | null> {
        try {
            const newEthWallet = await this.cryptoWallet.createWallet();
            return {
                success: true,
                wallet: {
                    isPrimarySourceWallet: false,
                    name: name,
                    address: newEthWallet.address,
                    publicKey: newEthWallet.publicKey,
                    privateKey: newEthWallet.privateKey,
                    mnemonicPhrase: newEthWallet.mnemonic.phrase,
                    mnemonicPath: newEthWallet.mnemonic.path,
                    mnemonicLocale: newEthWallet.mnemonic.locale,
                    currentBalance: "0"
                }
            };

        } catch (e) {
            return null;
        }
    }
}