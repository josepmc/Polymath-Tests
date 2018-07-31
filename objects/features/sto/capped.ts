import { injectable } from "framework/object/core/iConstructor";
import { Locator, By, oh } from "framework/helpers";
import { label, present, inputField, comboBox, ClickMode } from "framework/object/core/decorators";
import { StoConfig, StoWidget } from "./abstract";
import { PageWithToken } from "objects/pages/withToken/base";
import { CappedStoConfigModel, AmPm, RaiseIn } from "models/cappedStoConfig";


export class CappedStoConfig extends StoConfig implements CappedStoConfigModel {
    protected featureSelector: Locator = By.xpath('.//*[@]');
    @inputField<string>(By.xpath('.//*[@id="start"]'),
        By.xpath('//*[contains(@class, "flatpickr-day")][contains(@class, "selected")]'),
        { clickMode: ClickMode.ClickAfterSet }) public startDate: string;
    @inputField<string>(By.xpath('.//*[@id="end"]'),
        By.xpath('//*[contains(@class, "flatpickr-day")][contains(@class, "selected")]'),
        { clickMode: ClickMode.ClickAfterSet }) public endDate: string;
    @inputField<string>(By.xpath('.//*[@name="startTime"]')) public startTime: string;
    @comboBox(By.xpath('.//*[@id="startTime-select"]'), {
        'AM': AmPm.AM,
        'PM': AmPm.PM
    }) public startTimeAmPm: AmPm;
    @inputField<string>(By.xpath('.//*[@name="endTime"]')) public endTime: string;
    @comboBox(By.xpath('.//*[@id="endTime-select"]'), {
        'AM': AmPm.AM,
        'PM': AmPm.PM
    }) public endTimeAmPm: AmPm;
    @comboBox(By.xpath('.//*[@name="currency"]'), {
        'POLY': RaiseIn.Poly,
        'ETH': RaiseIn.Eth
    }) public raiseIn: RaiseIn;
    @inputField<number>(By.xpath('.//*[@id="cap"]')) public hardCap: number;
    @inputField<number>(By.xpath('.//*[@id="rate"]')) public rate: number;
    @inputField<string>(By.xpath('.//*[@id="fundsReceiver"]')) public ethAddress: string;
    @label<number>(By.xpath('.//fieldset'), /(\d+)/) public fundsRaised: number;

    public next(): Promise<PageWithToken> {
        return oh.click(this.element, By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]')).then(() => PageWithToken.Get(PageWithToken) as Promise<PageWithToken>);
    }
}

@injectable export class CappedSto extends StoWidget {
    protected featureSelector: Locator = By.xpath('.//*[@class="mint-tokens-wrapper"]');
    @label<string>(By.xpath('.//p[starts-with(text(), "0x")]')) public ethAddress: string;
    @label<string>(By.xpath('.//*[@class="bx--form-item"][./label[text()="Description"]]/p')) public description: string;
    @present(By.xpath('.//*[@name="checkmark--glyph"]')) public verifiedOnEtherscan: boolean;
    @present(By.xpath('.//*[@contains(@class, "bx--tag--ibm")]')) public allowsEth: boolean;
    @present(By.xpath('.//*[contains(@class, "bx--tag--custom")]')) public allowsPoly: boolean;
    @present(By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]')) public hasNext: boolean;
    public seeOnEtherscan() {
        // TODO: Implement Etherscan parser
        return oh.click(this.element, By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--secondary")]'));
    }
    public next(): Promise<CappedStoConfig> {
        if (this.hasNext === false) throw `This widget doesn't support the next() function`;
        return oh.click(this.element, By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]')).then(() => new CappedStoConfig(this.parent).load());
    }
}