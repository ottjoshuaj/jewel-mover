

export default class SystemMenus {

    public writeMsgToScreen(msg: string) {
        console.log(`${msg}\r`);
    }

    public writeMainMenuToScreen():void {
        this.writeMsgToScreen('=================================================================================================================================')
        this.writeMsgToScreen('Welcome to our otter-autobot for jewel and defikingdoms, Please use the following menu to perform actions:');
        this.writeMsgToScreen('=================================================================================================================================')
        this.writeMsgToScreen('1 - Create (x) new wallets automatically');
        this.writeMsgToScreen('2 - Manually Add a wallet');
        this.writeMsgToScreen('3 - List all current wallets (will update local db file with current LIVE balances)');
        this.writeMsgToScreen('4 - Specify specific wallet as SOURCE wallet (where all Harmony funds will come from)');
        this.writeMsgToScreen('5 - Fund all wallets (excluding the SOURCE wallet)');
        this.writeMsgToScreen('6 - List all heroes by wallet');
        this.writeMsgToScreen('7 - Send Heroes to all wallets (excluding the SOURCE wallet) (ONLY IF Wallet doesnt have a hero!)');
        this.writeMsgToScreen('8 - Run auto-bot full cycle forever (this will send all heros on quests, cancel quests when available, wait, then restart quests..etc.. CTRL+C to quit)');
        this.writeMsgToScreen('M - Move locked jewel from wallet A to wallet B)');
        this.writeMsgToScreen('INIT - Run the init process against all wallets');
        this.writeMsgToScreen('X - Exit');
        this.writeMsgToScreen('=================================================================================================================================')
    }

    public writeBotMenuToScreen() : void {

    }

    public writeQuestMenuToScreen() : void {

    }

    public writeHeroesMenuToScreen() : void {

    }

}