import { PageWithHeader } from "objects/pages/base";
import { Locator, By } from "framework/helpers";


export class InvestorPage extends PageWithHeader {
    protected featureSelector: Locator = By.xpath('.//*[@]');
}