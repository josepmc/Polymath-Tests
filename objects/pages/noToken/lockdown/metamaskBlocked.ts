import { Locator, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { CorePage } from "objects/pages/base";

// TODO: Fix these locators
@injectable export class MetamaskBlocked extends CorePage {
    protected featureSelector: Locator = By.xpath('.//body[.//h1[text()="Your MetaMask Is Locked"]]');
}