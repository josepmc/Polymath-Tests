import { injectable } from "framework/object/core/iConstructor";
import { Locator, By } from "framework/helpers";
import { inputField } from "framework/object/core/decorators";
import { InvestorModal } from "./base";


@injectable export class AllowedToInvest extends InvestorModal {
    public featureSelector: Locator = By.xpath('.//*[contains(@class,"purchase-modal") and contains(@class,"is-visible")]');
    @inputField<number>(By.xpath('.//*[@name="tokens"]')) public tokens: number;
    @inputField<number>(By.xpath('.//*[@name="cost"]')) public cost: number;
}