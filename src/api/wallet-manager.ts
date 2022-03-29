import {IWallet} from "../interfaces/wallet/interface-wallet";
import CryptoWallet from "../classes/wallet/crypto-wallet";

export default class WalletManager {
    private cryptoWallet: CryptoWallet;

    constructor() {
        this.cryptoWallet = new CryptoWallet();
    }

    public async createWallet(name: string): Promise<IWallet | null> {
        try {
            const newEthWallet = await this.cryptoWallet.createWallet();
            return {
                isPrimarySourceWallet: false,
                name: name,
                address: newEthWallet.address,
                publicKey: newEthWallet.publicKey,
                privateKey: newEthWallet.privateKey,
                mnemonicPhrase: newEthWallet.mnemonic.phrase,
                mnemonicPath: newEthWallet.mnemonic.path,
                mnemonicLocale: newEthWallet.mnemonic.locale,
                currentBalance: "0"
            };

        } catch (e) {
            return null;
        }
    }
}