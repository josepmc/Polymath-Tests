import { AccountManager } from ".";
import { Locator, By, oh, ElementWrapper } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { Import } from "../../pages/account/import";
import { Detail } from "../../pages/account/detail";
import { label, inputField, LabelOptsMode } from "framework/object/core/decorators";
import { MetamaskPage } from "../../pages";

@injectable export class AccountCreate extends MetamaskPage {
    protected featureSelector: Locator = By.xpath('.//*[@class="new-account"]');
    @inputField<string>(By.xpath('.//*[@class="new-account-create-form__input"]')) public name: string;
    public async import(lookForNext: boolean = true): Promise<Import> { return null; }
    public async connect(lookForNext: boolean = true): Promise<Import> { return null; }
    public next(lookForNext: boolean = true): Promise<Detail> {
        return oh.click(By.xpath('.//button[contains(@class, "btn-primary")]'), this.element)
            .then(() => lookForNext && Detail.WaitForPage<Detail>(Detail));
    }
}

@injectable export class NewAccountManager extends AccountManager {
    protected featureSelector: Locator = By.xpath('.//*[@class="account-menu__icon"]');
    @label<string[]>(By.xpath('//*[contains(@class, "account-menu__name")]'),
        null,
        {
            mode: LabelOptsMode.Text,
            alwaysArray: true,
            preGet: async function () { await this.target.waitForMenu(); },
            postGet: async function () { await oh.click(By.xpath('.//*[@class="menu__close-area"]')); }
        }
    ) public accounts: string[];
    public async create(lookForNext: boolean = true, accountCreation: boolean = true): Promise<Detail | AccountCreate> {
        await this.waitForMenu();
        let el = await oh.by(By.xpath('.//*[@class="menu__item__text"][text()="Create Account"]'));
        await this.click(el);
        if (accountCreation) {
            let create = await AccountCreate.WaitForPage<AccountCreate>(AccountCreate);
            return create.next(lookForNext);
        }
        return lookForNext && Detail.WaitForPage<Detail>([Detail, AccountCreate]);
    }
    public async import(lookForNext: boolean = true): Promise<Import> { return null; }
    public async select(name: string, lookForNext: boolean = true): Promise<Detail> {
        await this.waitForMenu();
        let el = await oh.by(By.xpath(`.//*[@class="account-menu__name"][text()="${name}"]`));
        return this.click(el).then(() => lookForNext && Detail.WaitForPage<Detail>(Detail));
    }
    public async waitForMenu(): Promise<void> {
        await oh.click(this.element);
        await oh.wait(oh.visible(By.xpath('.//*[@class="account-menu__accounts"]')), `Timeout waiting for the dropdown menu to appear`);
    }
    public async click(element: ElementWrapper): Promise<void> {
        let dropdown: ElementWrapper =
            await oh.by(By.xpath('.//*[@class="account-menu__accounts"]'));
        await oh.browser.executeScript(`arguments[0].scroll(0, arguments[1].offsetTop)`,
            await dropdown.getWebElement(), await element.getWebElement());
        await oh.click(element);
    }
}