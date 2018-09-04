import { injectable } from "framework/object/core/iConstructor";
import { Locator, By } from "framework/helpers";
import { InvestorModal } from "./base";


@injectable export class NotAllowedToInvest extends InvestorModal {
    public featureSelector: Locator = By.xpath('.//*[@class="bx--modal-content__text"][contains(text(), "not allowed to participate")]');
}