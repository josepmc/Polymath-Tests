import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { inputField, singleCheckbox } from "framework/object/core/decorators";
import { EmailValidationFeature } from "objects/features/account/emailValidation";


export class AccountFeature extends AbstractFeature {
    public featureSelector: Locator = By.xpath('.//form[@class="bx--form"]');
    @inputField<string>(By.xpath('.//*[@name="name"]')) public fullName: string;
    @inputField<string>(By.xpath('.//*[@name="email"]')) public email: string;
    @singleCheckbox(By.xpath('.//*[@name="acceptPrivacy"]')) public marketingConsent: boolean;
    @singleCheckbox(By.xpath('.//*[@name="acceptTerms"]')) public termsOfUse: boolean;
    public next(): Promise<EmailValidationFeature> {
        return oh.click(this.element, By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]')).then(() => new EmailValidationFeature().load());
    }
}