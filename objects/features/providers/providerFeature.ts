import { injectable } from "framework/object/core/iConstructor";
import { Locator, By } from "framework/helpers";
import { AbstractFeature } from "framework/object/abstract";


@injectable export class ProviderFeature extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[@class="bx--tabs__nav-item"]');
}