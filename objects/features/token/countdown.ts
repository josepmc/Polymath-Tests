import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { Modal } from "objects/features/general/modal";

export abstract class AbstractCountdownFeature extends AbstractFeature { }

@injectable export class CountdownFeature extends AbstractCountdownFeature {
    public featureSelector: Locator = By.xpath('.//*[contains(@class,"pui-countdown ") or @class="pui-countdown"]');
}

@injectable export class CreateTokenCountdown extends AbstractCountdownFeature {
    public featureSelector: Locator = By.xpath('.//*[@class="pui-countdown"]');
    public next(): Promise<Modal> {
        return oh.click(By.xpath('.//button'), this.element).then(() => Modal.WaitForPage<Modal>(Modal));
    }
}