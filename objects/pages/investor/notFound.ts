import { InvestorPage } from "./base";
import { Locator, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";


@injectable export class InvestorSTONotFound extends InvestorPage {
    public featureSelector: Locator = By.xpath('//body[not(.//*[@class="pui-sto-status-contract"])][.//*[@class="pui-single-box"][count(./*)=1]]');
    public navigateToPage(): Promise<this> {
        return super.navigateToPage('<nonExistingToken>');
    }
}