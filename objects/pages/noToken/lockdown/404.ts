import { Locator, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { CorePage } from "objects/pages/base";

// TODO: Fix these locators
@injectable export class NotFound extends CorePage {
    protected featureSelector: Locator = By.xpath('.//body[.//h3[text()="Segmentation Fault! – Just kidding it\'s only a 404 – Page Not Found"]]');
}