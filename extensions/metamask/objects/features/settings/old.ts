import { Settings, SettingsPage } from ".";
import { Locator, By, oh } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { Locked } from "../../pages/locked";


@injectable export class OldSettings extends Settings {
    protected featureSelector: Locator = By.xpath('.//*[@class="sandwich-expando"]');
    public async lock(lookForNext: boolean = true): Promise<Locked> {
        await oh.click(this.element);
        let loc = By.xpath('.//*[@class="menu-droppo"]//*[@class="dropdown-menu-item"]');
        await oh.wait(oh.clickable(loc), `Settings: Timeout waiting for the lock button to appear`);
        return oh.click(loc).then(() => lookForNext && Locked.WaitForPage<Locked>(Locked));
    }
    public async settings(lookForNext: boolean = true): Promise<SettingsPage> { return null; }
    public async info(lookForNext: boolean = true): Promise<void> { }
    public async beta(lookForNext: boolean = true): Promise<void> { }
}