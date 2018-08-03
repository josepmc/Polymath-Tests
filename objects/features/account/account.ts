import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { inputField, singleCheckbox } from "framework/object/core/decorators";
import { IssuerModel } from "models/issuer";
import { CorePage } from "objects/pages/base";


export class AccountFeature extends AbstractFeature implements IssuerModel {
    public featureSelector: Locator = By.xpath('.//form[@class="bx--form"][.//*[@name="name"]]');
    @inputField<string>(By.xpath('.//*[@name="name"]')) public fullName: string;
    @inputField<string>(By.xpath('.//*[@name="email"]')) public email: string;
    @singleCheckbox(By.xpath('.//*[./*[@name="acceptPrivacy"]]/label'), { checkedSelector: By.xpath('//*[@name="acceptPrivacy" and @value="true"]') }) public marketingConsent: boolean;
    @singleCheckbox(By.xpath('.//*[./*[@name="acceptTerms"]]/label'), { checkedSelector: By.xpath('//*[@name="acceptTerms" and @value="true"]') }) public termsOfUse: boolean;
    public next(): Promise<CorePage> {
        return oh.click(By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]'), this.element).then(() => CorePage.Get<CorePage>(CorePage));
    }
}