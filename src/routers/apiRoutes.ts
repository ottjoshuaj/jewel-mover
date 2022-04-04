import express from 'express'
import { v4 as uuidv4 } from 'uuid';

import WalletManager from "../api/wallet-manager";
import QuestManager from "../api/quest-manager";
import HeroManager from "../api/hero-manager";
import ProfileManager from "../api/profile-manager";
import JewelManager from "../api/jewel-manager";
import TrueWallet from "../api/true-wallet";
import ConsuamblesManager from "../api/consuambles-manager";

const router = express.Router({mergeParams: true});

router.route('/wallets/list').get(
    async (request, response, next) => {
        //response.status(200).send(GenerateWalletsWorkFlow.instance.currentWallets);
        response.status(200).send("YEAH RIGHT, YOU WISH!");
    }
);

router.route('/verify').post(
    async (request, response, next) => {
        console.log(`[${new Date().toLocaleString()}] => Received application verification call`);

        const uuid = `${uuidv4()}`;

        //Check API KEY and IP of user , compare to DB.
        response.status(200).send({
            success: true,
            serverKey: uuid
        });

        console.log(`[${new Date().toLocaleString()}] => Received application verification call => COMPLETE`);
    }
);

router.route('/wallets/create').post(
    async (request, response, next) => {
        try {
            const { name } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Received wallet create Call => Creating new wallet called: ${name}`);

            response.status(200).send(await WalletManager.instance.createWallet(name));

            console.log(`[${new Date().toLocaleString()}] => Received wallet create Call => Creating new wallet called: ${name} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);

router.route('/wallets/fund').post(
    async (request, response, next) => {
        try {
            const { wallet, destinationAddress, amount } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Received wallet fund Call => Sending ${amount} FROM => ${wallet.address} => TO ${destinationAddress}`);

            response.status(200).send(await TrueWallet.instance.sendOneToWallet(wallet, destinationAddress, amount));

            console.log(`[${new Date().toLocaleString()}] => Received wallet fund Call => Sending ${amount} FROM => ${wallet.address} => TO ${destinationAddress} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);

router.route('/consumable/use').post(
    async (request, response, next) => {
        try {
            const { wallet, itemAddress, heroId } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Received consumable use Call => Hero: ${heroId} is consuming item: ${itemAddress}`);

            response.status(200).send(await ConsuamblesManager.instance.useConsumable(wallet, itemAddress, heroId));

            console.log(`[${new Date().toLocaleString()}] => Received consumable use Call => Hero: ${heroId} is consuming item: ${itemAddress} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);

router.route('/profile/create').post(
    async (request, response, next) => {
        try {
            const { wallet } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Received DFK Profile Create Call => ${wallet.address} => Creating Profile With Name => ${wallet.name}`);

            response.status(200).send(await ProfileManager.instance.onBoardWalletToDefiKingdoms(wallet));

            console.log(`[${new Date().toLocaleString()}] => Received DFK Profile Create Call => ${wallet.address} => Creating Profile With Name => ${wallet.name} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);

router.route('/quest/start').post(
    async (request, response, next) => {
        try {
            const { wallet, heroId } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Received Quest Create Call => Wallet: ${wallet.address} => HeroId: ${heroId}`);

            response.status(200).send(await QuestManager.instance.startQuest(wallet, [heroId]));

            console.log(`[${new Date().toLocaleString()}] => Received Quest Create Call => Wallet: ${wallet.address} => HeroId: ${heroId} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);

router.route('/quest/cancel').post(
    async (request, response, next) => {
        try {
            const { wallet, heroId } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Received Quest Cancel Call => Wallet: ${wallet.address} => HeroId: ${heroId}`);

            response.status(200).send(await QuestManager.instance.cancelQuest(wallet, heroId));

            console.log(`[${new Date().toLocaleString()}] => Received Quest Cancel Call => Wallet: ${wallet.address} => HeroId: ${heroId} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);


router.route('/quest/complete').post(
    async (request, response, next) => {
        try {
            const { wallet, heroId } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Received Quest Complete Call => Starting Complete For => Wallet: ${wallet.address} => HeroId: ${heroId}`);

            response.status(200).send(await QuestManager.instance.completeQuest(wallet, heroId));

            console.log(`[${new Date().toLocaleString()}] => Received Quest Complete Call => Starting Complete For => Wallet: ${wallet.address} => HeroId: ${heroId} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);

router.route('/hero/transfer').post(
    async (request, response, next) => {
        try {
            const { wallet, destinationAddress, heroId } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Received Hero Transfer Call => Transfering HeroId: ${heroId} => FROM WALLET: ${wallet.address} => TO WALLET: ${destinationAddress}`);

            response.status(200).send(await HeroManager.instance.transferHeroToWallet(wallet, destinationAddress, heroId));

            console.log(`[${new Date().toLocaleString()}] => Received Hero Transfer Call => Transfering HeroId: ${heroId} => FROM WALLET: ${wallet.address} => TO WALLET: ${destinationAddress} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);

router.route('/jewel/transfer').post(
    async (request, response, next) => {
        try {
            const { wallet, destinationAddress } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Received Jewel Transfer Call => Moving all jewel => FROM WALLET: ${wallet.address} => TO WALLET: ${destinationAddress}`);

            response.status(200).send(await JewelManager.instance.transferLockedJewel(wallet, destinationAddress));

            console.log(`[${new Date().toLocaleString()}] => Received Jewel Transfer Call => Moving all jewel => FROM WALLET: ${wallet.address} => TO WALLET: ${destinationAddress} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);

router.route('/hero/stamina').post(
    async (request, response, next) => {
        try {
            const { wallet, destinationAddress, amount } = request.body;

            console.log(`[${new Date().toLocaleString()}] => Hero Stam Call => FROM WALLET: ${wallet.address} => TO WALLET: ${destinationAddress} => ${amount}`);

            response.status(200).send(await JewelManager.instance.transfer(wallet, destinationAddress, amount ));

            console.log(`[${new Date().toLocaleString()}] => Hero Stam Call => FROM WALLET: ${wallet.address} => TO WALLET: ${destinationAddress} => COMPLETE`);
        } catch (e) {
            console.log({ status: 'exceptionHandled', error: e });
            response.status(200).send({ success: false });
        }
    }
);

export default router;