import { injectable } from "framework/object/core/iConstructor";
import { Locator, By } from "framework/helpers";
import { AbstractFeature } from "framework/object/abstract";


@injectable export class TokenInfo extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[@class="token-symbol-wrapper"]');
}