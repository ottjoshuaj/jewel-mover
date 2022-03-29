import {IWallet} from "../wallet/interface-wallet";

export interface DefaultResponse {
    success: boolean;
    results?: any;
    error?: any;
}

export interface AddWalletResponse extends DefaultResponse {
    newWallets?: [IWallet];
}