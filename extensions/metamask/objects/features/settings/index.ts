import { AbstractFeature, AbstractPage } from "framework/object/abstract";
import { Locked } from "../../pages/locked";


export abstract class Settings extends AbstractFeature {
    public abstract lock(lookForNext?: boolean): Promise<Locked>;
    public abstract settings(lookForNext?: boolean): Promise<SettingsPage>;
    public abstract info(lookForNext?: boolean): Promise<void>;
}

export abstract class SettingsPage extends AbstractPage {
    public customRpc: string;
    public abstract async next(): Promise<AbstractPage>;
}