import { injectable, inject } from "framework/object/core/iConstructor";
import { BaseSto } from "./abstract";
import { Locator, By } from "framework/helpers";
import { StoWidget } from "objects/features/sto/abstract";

@injectable export class StoSelector extends BaseSto {
    public featureSelector: Locator = By.xpath('self::*[.//*[contains(@class,"sto-factory")]]');
    @inject(StoWidget, { multiInstance: true }) public list: StoWidget[];
}