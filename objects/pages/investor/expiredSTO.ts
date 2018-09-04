import { InvestorWithSTO } from "./base";
import { Locator, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";


@injectable export class ExpiredSTO extends InvestorWithSTO {
    public featureSelector: Locator = By.xpath('//body[.//*[@class="pui-sto-status-contract"]][not(.//*[@class="pui-countdown"])]');
}