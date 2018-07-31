import { injectable } from "framework/object/core/iConstructor";
import { Locator, By, oh } from "framework/helpers";
import { AbstractFeature, optional } from "framework/object/abstract";
import { inputField, radioBox, singleCheckbox } from "framework/object/core/decorators";
import { Modal } from "objects/features/general/modal";
import { CountdownFeature } from "../token/countdown";
import { DivisibleIndivisible, TokenInfoModel } from "models/tokenInfo";

@injectable export class CreateTokenFeature extends AbstractFeature implements TokenInfoModel {
    protected featureSelector: Locator = By.xpath('.//*[@class="mint-tokens-wrapper"]');
    @radioBox(By.xpath('.//*[@class="bx--radio-button-group"]'), {
        './/*[@id="isDivisible-0"]': DivisibleIndivisible.Divisble,
        './/*[@id="isDivisible-1"]': DivisibleIndivisible.Indivisible
    }) public tokenDivisibility: DivisibleIndivisible;
    @singleCheckbox(By.xpath('.//*[@for="investors-number-toggle"]')) public allowMaxInvestors: boolean;
    @optional @inputField<number>(By.xpath('.//*[@id="investorsNumber"]')) public maxInvestors?: number;
    @inputField<string>(By.xpath('.//*[@id="details"]')) public additionalTokenInformation: string;

    public countdown: CountdownFeature = new CountdownFeature(this);
    public next(): Promise<Modal> {
        return oh.click(this.element, By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]')).then(() => new Modal().load());
    }
}