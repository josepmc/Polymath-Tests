import { Locator, By } from "framework/helpers";
import { IssuerPage } from "objects/pages/base";
import { EmailValidationFeature } from "objects/features/account/emailValidation";
import { injectable } from "framework/object/core/iConstructor";


@injectable export class EmailVerification extends IssuerPage {
    protected featureSelector: Locator = By.xpath('.//body[.//*[contains(@class,"confirm-email-form")]]');
    public verify: EmailValidationFeature = new EmailValidationFeature()
}