import {HeroList} from "../dfk/iheroes";

export interface IWallet {
    keyId?: number;
    isPrimarySourceWallet: boolean;
    hasDfkProfile?: boolean;
    name?: string;
    address?: string;
    publicKey?: string;
    privateKey?: string;
    mnemonicPhrase?: string;
    mnemonicPath?: string;
    mnemonicLocale?: string;
    availableHeroes?: HeroList;
    assignedHero?: number;
    assignedHeroStamina?: number;
    isOnQuest?: boolean;
    questStartedAt?: Date;
    questCompletesAt?: Date;
    currentBalance?: string;
    dfkProfile?: any;
    isHoldingTheJewel?: boolean;
    jewelBalance?: string;
}