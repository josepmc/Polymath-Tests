import { Detail } from ".";
import { Locator, By, oh } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { LabelOptsMode, label, NumberParseMethod, customDecorator } from "framework/object/core/decorators";
import { AbstractFeature } from "framework/object/abstract";

export class NewDetailExtra extends AbstractFeature {
    public featureSelector: Locator = By.xpath('.//*[@class="account-modal-container"]');
    @label<string>(By.xpath('.//*[@class="editable-label__value"]'), null, { mode: LabelOptsMode.Text }) public accountName;
    @label<string>(By.xpath('.//*[@class="qr-ellip-address"]'), null, { mode: LabelOptsMode.Value, numberParseMethod: NumberParseMethod.None }) public ethAddress;
    public async close(): Promise<void> {
        // We can't click on an 'after' effect
        return await oh.browser.actions().mouseMove({ x: 0, y: 0 }).click().perform();
    }
}

@injectable export class NewDetail extends Detail {
    protected featureSelector: Locator = By.xpath('self::*[.//*[contains(@class,"account-and-transaction-details")]]');
    @label<string>(By.xpath('.//*[@class="account-name"]'),
        null, { mode: LabelOptsMode.Text }) public name: string;
    @label<number>(By.xpath('.//*[@class="wallet-balance"]//*[@class="token-amount"]'),
        null, {
            numberParseMethod: NumberParseMethod.ParseFloat,
            mode: LabelOptsMode.Text
        }) public ethAmount: number;
    @customDecorator<string>(async function () {
        let details: NewDetailExtra = await this.target.extraDetails();
        await details.init();
        await details.close();
        return details.ethAddress;
    }) public ethAddress: string;
    public async extraDetails(lookForNext: boolean = true): Promise<NewDetailExtra> {
        return oh.click(By.xpath('.//*[contains(@class, "wallet-view__details-button")]'), this.element).
            then(() => lookForNext && new NewDetailExtra().load());
    }
}