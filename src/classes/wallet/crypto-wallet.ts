import * as ethers from 'ethers';

export default class CryptoWallet {
    public async createWallet(): Promise<ethers.Wallet> {
        //Create & return new wallet
        return await ethers.Wallet.createRandom();
    }
}


