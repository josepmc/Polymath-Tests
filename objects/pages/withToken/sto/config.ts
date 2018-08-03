import { injectable, inject } from "framework/object/core/iConstructor";
import { BaseSto } from "./abstract";
import { Locator, By, oh } from "framework/helpers";
import { StoWidget, StoConfig } from "objects/features/sto/abstract";
import { StoSelector } from "./selector";

@injectable export class StoConfigPage extends BaseSto {
    public featureSelector: Locator = By.xpath('self::*[.//*[contains(@class, "pui-go-back")]]');
    @inject(StoWidget) public widget: StoWidget;
    @inject(StoConfig) public config: StoConfig;
    public back(): Promise<StoSelector> {
        return oh.click(By.xpath('.//*[contains(@class, "pui-go-back")]'), this.element).then(() => new StoSelector().load());
    }
}