import { InvestorWithSTO } from "./base";
import { Locator, By, oh } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { CountdownFeature } from "objects/features/token/countdown";
import { InvestorModal } from "objects/features/investor/base";


@injectable export class ActiveSTO extends InvestorWithSTO {
    public featureSelector: Locator = By.xpath('//body[.//*[@class="pui-countdown-content"]][.//*[@class="pui-page-box"][following-sibling::button]]');
    public countdown: CountdownFeature = new CountdownFeature(this);
    public next(lookForNext: boolean = true): Promise<InvestorModal> {
        return oh.click(By.xpath('.//*[@class="pui-page-box"]/following-sibling::button'), this.element).then(() => lookForNext && InvestorModal.WaitForPage<InvestorModal>(InvestorModal));
    }
}