const ethers = require("ethers");
const config = require('../../config.json');

export default class ProviderSingleton {
    private static _instance: ProviderSingleton;
    private _provider: any;

    constructor() {
        //Setup provider and contracts
        if(config.rpc.mode === "websocket")
            this._provider = new ethers.providers.WebSocketProvider(config.rpc.websocket.urls[0]);
        else {
            this._provider = new ethers.providers.JsonRpcProvider(config.rpc.https.urls[0]);
        }
    }

    public static get instance() {
        this._instance = this._instance || new this();
        return this._instance;
    }

    public get provider() {
        return this._provider;
    }
}