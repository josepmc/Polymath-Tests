import { injectable } from "framework/object/core/iConstructor";
import { Locator, By, oh } from "framework/helpers";
import { label, present, inputField, comboBox, ClickMode, order, NumberParseMethod, customValuelessCombobox } from "framework/object/core/decorators";
import { StoConfig, StoWidget } from "./abstract";
import { CappedStoConfigModel, RaiseIn } from "models/cappedStoConfig";
import { Modal } from "objects/features/general/modal";


@injectable export class CappedStoConfig extends StoConfig implements CappedStoConfigModel {
    protected featureSelector: Locator = By.xpath('.//*[@class="bx--form"][.//*[@name="startTime"]]');
    @order(2) @inputField<string>(By.xpath('.//input[@id="startDate"]'), null,
        { clickMode: ClickMode.ClickAfterSet, sendEnter: true }) public startDate: string;
    @order(1) @inputField<string>(By.xpath('.//input[@id="endDate"]'), null,
        { clickMode: ClickMode.ClickAfterSet, sendEnter: true }) public endDate: string;
    @customValuelessCombobox(By.xpath('.//*[@name="startTime"]/option')) public startTime: string;
    @customValuelessCombobox(By.xpath('.//*[@name="endTime"]/option')) public endTime: string;
    @comboBox(By.xpath('.//*[@name="currency"]'), {
        'POLY': RaiseIn.Poly,
        'ETH': RaiseIn.Eth
    }, { ignoreNotVisible: true, noEmptyOptionPresent: true }) public raiseIn: RaiseIn;
    @inputField<number>(By.xpath('.//*[@id="cap"]')) public hardCap: number;
    @inputField<number>(By.xpath('.//*[@id="rate"]')) public rate: number;
    @inputField<string>(By.xpath('.//*[@id="fundsReceiver"]'), null, { numberParseMethod: NumberParseMethod.None }) public ethAddress: string;
    @label<number>(By.xpath('.//fieldset'), /(\d+)/) public fundsRaised: number;

    public next(): Promise<Modal> {
        return oh.click(By.xpath('.//button[@type="submit"]'), this.element).then(() => Modal.WaitForPage<Modal>(Modal));
    }
}

@injectable export class CappedSto extends StoWidget {
    protected featureSelector: Locator = By.xpath('.//*[contains(@class, "sto-factory")]');
    @label<string>(By.xpath('.//p[starts-with(text(), "0x")]')) public ethAddress: string;
    @label<string>(By.xpath('.//*[@class="bx--form-item"][./label[text()="Description"]]/p')) public description: string;
    @present(By.xpath('.//*[@name="checkmark--glyph"]')) public verifiedOnEtherscan: boolean;
    @present(By.xpath('.//*[contains(@class, "bx--tag--ibm")]')) public allowsEth: boolean;
    @present(By.xpath('.//*[contains(@class, "bx--tag--custom")]')) public allowsPoly: boolean;
    @present(By.xpath('.//button[contains(@class, "bx--btn--primary")]')) public hasNext: boolean;
    public seeOnEtherscan() {
        // TODO: Implement Etherscan parser
        return oh.click(By.xpath('.//button[contains(@class, "see-on-etherscan-link")]'), this.element);
    }
    public next(): Promise<CappedStoConfig> {
        if (this.hasNext === false) throw `This widget doesn't support the next() function`;
        return oh.click(By.xpath('.//button[contains(@class, "bx--btn--primary")]'), this.element).then(() => new CappedStoConfig(this.parent).load());
    }
}