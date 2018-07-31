import { BaseSto } from "./abstract";
import { Locator, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";

@injectable export class StoCountdown extends BaseSto {
    public featureSelector: Locator = By.xpath('self::*[.//*[@class="pui-countdown"]]');
}