import { Locator, By } from "framework/helpers";
import { CorePage } from "objects/pages/base";
import { EmailValidationFeature } from "objects/features/account/emailValidation";
import { injectable } from "framework/object/core/iConstructor";


@injectable export class EmailVerification extends CorePage {
    protected featureSelector: Locator = By.xpath('.//body[.//*[contains(@class,"confirm-email-form")]]');
    public verify: EmailValidationFeature = new EmailValidationFeature()
}