import express from 'express'
import { v4 as uuidv4 } from 'uuid';

import WalletManager from "../api/wallet-manager";
import QuestManager from "../api/quest-manager";
import HeroManager from "../api/hero-manager";
import ProfileManager from "../api/profile-manager";
import JewelManager from "../api/jewel-manager";
import TrueWallet from "../api/true-wallet";

const router = express.Router({mergeParams: true});

router.route('/wallets/list').get(
    async (request, response, next) => {
        //response.status(200).send(GenerateWalletsWorkFlow.instance.currentWallets);
        response.status(200).send("YEAH RIGHT, YOU WISH!");
    }
);

router.route('/verify').post(
    async (request, response, next) => {
        const uuid = `${uuidv4()}`;

        //Check API KEY and IP of user , compare to DB.
        response.status(200).send({
            success: true,
            serverKey: uuid
        });
    }
);

router.route('/wallets/create').post(
    async (request, response, next) => {
        const { name } = request.body;

        response.status(200).send(await new WalletManager().createWallet(name));
    }
);

router.route('/wallets/fund').post(
    async (request, response, next) => {
        const { wallet, destinationAddress, amount } = request.body;
        const trueWallet = new TrueWallet();

        response.status(200).send(await trueWallet.sendOneToWallet(wallet, destinationAddress, amount));
    }
);

router.route('/profile/create').post(
    async (request, response, next) => {
        const { wallet } = request.body;
        const profileManager = new ProfileManager();

        response.status(200).send(await profileManager.onBoardWalletToDefiKingdoms(wallet));
    }
);

router.route('/quest/start').post(
    async (request, response, next) => {
        const { wallet, heroId } = request.body;
        const questManager = await new QuestManager();

        response.status(200).send(await questManager.startQuest(wallet, heroId));
    }
);

router.route('/quest/cancel').post(
    async (request, response, next) => {
        const { wallet, heroId } = request.body;
        const questManager = await new QuestManager();

        response.status(200).send(await questManager.cancelQuest(wallet, heroId));
    }
);


router.route('/quest/complete').post(
    async (request, response, next) => {
        const { wallet, heroId } = request.body;
        const questManager = await new QuestManager();

        response.status(200).send(await questManager.completeQuest(wallet, heroId));
    }
);

router.route('/hero/transfer').post(
    async (request, response, next) => {
        const { wallet, destinationAddress, heroId } = request.body;
        const heroManager = new HeroManager();

        response.status(200).send(await heroManager.transferHeroToWallet(wallet, destinationAddress, heroId));
    }
);

router.route('/jewel/transfer').post(
    async (request, response, next) => {
        const { wallet, destinationAddress } = request.body;
        const jewelManager = new JewelManager();

        response.status(200).send(await jewelManager.transferLockedJewel(wallet, destinationAddress));
    }
);

export default router;