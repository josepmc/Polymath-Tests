import { InvestorWithSTO } from "./base";
import { Locator, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { CountdownFeature } from "objects/features/token/countdown";

// Same as the STO page with countdown
@injectable export class WaitForSTO extends InvestorWithSTO {
    public featureSelector: Locator = By.xpath('//body[.//*[@class="pui-countdown-content"]][not(.//*[@class="pui-page-box"][following-sibling::button])]');
    public countdown: CountdownFeature = new CountdownFeature(this);
}