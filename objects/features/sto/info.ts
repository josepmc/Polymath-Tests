import { AbstractFeature } from "framework/object/abstract";
import { injectable } from "framework/object/core/iConstructor";
import { Locator, By } from "framework/helpers";
import { label, LabelOptsMode, NumberParseMethod } from "framework/object/core/decorators";

@injectable export class StoInfo extends AbstractFeature {
    public featureSelector: Locator = By.xpath('.//*[@class="pui-page-box"][.//*[@class="pui-sto-status-contract"]]');
    @label<string>(By.xpath('.//*[@class="pui-sto-status-contract"]/a'), null, { mode: LabelOptsMode.Text, numberParseMethod: NumberParseMethod.None }) public contract: string;
    @label<string>(By.xpath('.//*[@class="pui-sto-status-numbers"]/div[not(@class="pui-key-value")]'), null, { mode: LabelOptsMode.Text }) public percentage: number;
    @label<string>(By.xpath('.//*[@class="pui-sto-status-numbers"]/div[@class="pui-key-value"]'), /([\d,]+)/, { mode: LabelOptsMode.Text, numberParseMethod: NumberParseMethod.ParseIntWithCommas }) public cap: number;
    @label<string>(By.xpath('.//*[@class="pui-sto-status-dates"]/div[./div[text()="Start Date"]]'), /.*\n(.*)/, { mode: LabelOptsMode.Text, dateFormat: "MMMM DD, YYYY" }) public startDate: Date;
    @label<string>(By.xpath('.//*[@class="pui-sto-status-dates"]/div[./div[text()="End Date"]]'), /.*\n(.*)/, { mode: LabelOptsMode.Text, dateFormat: "MMMM DD, YYYY" }) public endDate: Date;
    @label<string>(By.xpath('.//*[@class="pui-sto-status-dates"]//div[./span]'), /^\d+\s([^\s]+)/, { mode: LabelOptsMode.Text }) public currency: string;
    @label<string>(By.xpath('.//*[@class="pui-sto-status-dates"]//span'), /\s([^\s]+)$/, { mode: LabelOptsMode.Text }) public token: string;
    @label<string>(By.xpath('.//*[contains(@class, "pui-countdown-raised")]'), /(\d+)/, { mode: LabelOptsMode.Text }) public totalRaised: number;
    @label<string>(By.xpath('.//*[contains(@class, "pui-countdown-raised")]/div[2]'), /(\d+)/, { mode: LabelOptsMode.Text }) public totalRaisedCurrency: number;
    @label<string>(By.xpath('.//*[@class="pui-sto-status-dates"]//span'), /(\d+)/, { mode: LabelOptsMode.Text }) public conversion: number;
}