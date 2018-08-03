import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { inputField, label } from "framework/object/core/decorators";
import { TickerModel } from "models/ticker";
import { Modal } from "objects/features/general/modal";
import { injectable } from "framework/object/core/iConstructor";

@injectable export class TickerError extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[@id="ticker-error-msg"]');
}

export class TickerFeature extends AbstractFeature implements TickerModel {
    protected featureSelector: Locator = By.xpath('.//form[.//*[@name="ticker"]]');
    @inputField<string>(By.xpath('.//*[@name="ticker"]')) public symbol: string;
    @inputField<string>(By.xpath('.//*[@name="name"]')) public name: string;
    @label<string>(By.xpath('.//*[@name="owner"]')) public ethAddress: string;
    public async next(): Promise<Modal | TickerError> {
        await oh.click(By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]'), this.element);
        return await TickerError.WaitForPage([Modal, TickerError]) as Modal | TickerError;
    }
}