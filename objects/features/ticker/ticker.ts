import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { inputField, label } from "framework/object/core/decorators";
import { TickerModel } from "models/ticker";
import { Modal } from "objects/features/general/modal";


export class TickerFeature extends AbstractFeature implements TickerModel {
    protected featureSelector: Locator = By.xpath('.//form[.//*[@name="ticker"]]');
    @inputField<string>(By.xpath('.//*[@name="ticker"]')) public symbol: string;
    @inputField<string>(By.xpath('.//*[@name="name"]')) public name: string;
    @label<string>(By.xpath('.//*[@name="owner"]')) public ethAddress: string;
    public next(): Promise<Modal> {
        return oh.click(this.element, By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]')).then(() => new Modal().load());
    }
}