import { Locator, oh, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { PageWithHeader } from "objects/pages/base";
import { AccountFeature } from "objects/features/account/account";

@injectable export class AccountPage extends PageWithHeader {
    protected featureSelector: Locator = By.xpath('.//body[.//*[@name="acceptPrivacy"]]');
    public account: AccountFeature = new AccountFeature(this);
}