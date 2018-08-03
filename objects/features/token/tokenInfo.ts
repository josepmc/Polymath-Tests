import { injectable } from "framework/object/core/iConstructor";
import { Locator, By } from "framework/helpers";
import { AbstractFeature } from "framework/object/abstract";


export abstract class AbstractTokenInfo extends AbstractFeature { }

@injectable export class TokenInfo extends AbstractTokenInfo {
    protected featureSelector: Locator = By.xpath('.//*[@class="token-symbol-wrapper"][not(.//*[contains(@class, "bx--btn--secondary")])]');
}