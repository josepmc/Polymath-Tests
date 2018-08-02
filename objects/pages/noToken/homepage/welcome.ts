import { Locator, oh, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { CorePage } from "objects/pages/base";
import { SignPage } from "objects/pages/noToken/sign/sign";

@injectable export class Welcome extends CorePage {
    protected featureSelector: Locator = By.xpath('.//body[.//button[text()="CREATE YOUR SECURITY TOKEN"]]');
    constructor() {
        super(oh.browser.baseUrl);
    }
    public async next(): Promise<SignPage> {
        await oh.click(By.xpath('.//button[text()="CREATE YOUR SECURITY TOKEN"]'));
        return await new SignPage().load();
    }
}