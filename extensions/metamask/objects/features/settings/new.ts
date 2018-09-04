import { Settings, SettingsPage } from ".";
import { Locator, By, oh } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { Locked } from "../../pages/locked";
// Beware with circular references
import { NewAccountManager } from "../account/new";
import { MetamaskPage } from "../../pages";
import { inputField } from "framework/object/core/decorators";


@injectable export class NewSettingsFakeMenu extends Settings {
    protected featureSelector: Locator = By.xpath('.//*[@class="account-menu__icon"]');
    public async lock(lookForNext: boolean = true): Promise<Locked> {
        await new NewAccountManager().waitForMenu();
        return oh.click(By.xpath('.//*[@class="account-menu__logout-button"]')).then(() => lookForNext && Locked.WaitForPage<Locked>(Locked));
    }
    public async settings(lookForNext: boolean = true): Promise<SettingsPage> {
        await new NewAccountManager().waitForMenu();
        await oh.click(By.xpath('.//*[contains(@class, "menu__item--clickable")]/div[text()="Settings"]'));
        return lookForNext && new NewSettingsPage().load();
    }
    public async info(lookForNext: boolean = true): Promise<void> { }
    // Taken from account manager, now they're the same
}

@injectable export class NewSettingsPage extends SettingsPage {
    protected featureSelector: Locator = By.xpath('.//*[@class="main-container settings"]');
    @inputField(By.xpath('.//*[@class="settings__input"]')) public customRpc: string;
    public async next(): Promise<MetamaskPage> {
        await oh.click(By.xpath('.//*[@class="settings__rpc-save-button"]'), this.element);
        return MetamaskPage.Get<MetamaskPage>(MetamaskPage);
    }
}