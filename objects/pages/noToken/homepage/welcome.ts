import { Locator, oh, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { CorePage } from "objects/pages/base";
import { SignPage } from "objects/pages/noToken/sign/sign";

@injectable export class Welcome extends CorePage {
    protected featureSelector: Locator = By.xpath('.//body[.//button[text()="CREATE YOUR SECURITY TOKEN"]]');
    constructor() {
        super(oh.browser.baseUrl);
    }
    public next(): Promise<SignPage> {
        return oh.click(this.element, By.xpath('.//button[text()="CREATE YOUR SECURITY TOKEN"]')).then(() => new SignPage().load());
    }
}