import { injectable } from "framework/object/core/iConstructor";
import { Locator, By, oh } from "framework/helpers";
import { AbstractFeature, optional } from "framework/object/abstract";
import { inputField, radioBox, singleCheckbox, order } from "framework/object/core/decorators";
import { Modal } from "objects/features/general/modal";
import { DivisibleIndivisible, TokenInfoModel } from "models/tokenInfo";
import { CountdownFeature } from "objects/features/token/countdown";

@injectable export class CreateTokenFeature extends AbstractFeature implements TokenInfoModel {
    protected featureSelector: Locator = By.xpath('.//*[@class="create-token-wrapper"]');
    @radioBox(By.xpath('.//*[@class="bx--radio-button-group"]'), {
        './/*[@for="isDivisible-0"]': DivisibleIndivisible.Divisble,
        './/*[@for="isDivisible-1"]': DivisibleIndivisible.Indivisible
    }, {
            checkedSelector: async function (element) {
                let selected = await oh.checked(By.xpath('self::*/..//input'), element);
                return selected;
            }
        }) public tokenDivisibility: DivisibleIndivisible;
    @order(2) @singleCheckbox(By.xpath('.//*[@for="investors-number-toggle"]'), { checkedSelector: By.xpath('//*[@id="investorsNumber"]') }) public allowMaxInvestors: boolean;
    @order(1) @optional @inputField<number>(By.xpath('.//*[@id="investorsNumber"]')) public maxInvestors?: number;
    @inputField<string>(By.xpath('.//*[@id="details"]')) public additionalTokenInformation: string;

    public countdown: CountdownFeature = new CountdownFeature(this);
    public async next(): Promise<Modal> {
        await oh.click(By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]'), this.element);
        return Modal.WaitForPage<Modal>(Modal);
    }
}