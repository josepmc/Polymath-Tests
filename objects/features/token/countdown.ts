import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { Modal } from "objects/features/general/modal";
import { label, LabelOptsMode, order, customDecorator } from "framework/object/core/decorators";
import * as moment from 'moment';

export abstract class AbstractCountdownFeature extends AbstractFeature { }

@injectable export class CountdownFeature extends AbstractCountdownFeature {
    public featureSelector: Locator = By.xpath('.//*[contains(@class,"pui-countdown ") or @class="pui-countdown"]');
    @order(5) @label<string>(By.xpath('.//*[@class="pui-countdown-days"]/*[@class="pui-countdown-number-column pui-countdown-number"]'), null, { mode: LabelOptsMode.Text }) public days: number;
    @order(4) @label<string>(By.xpath('.//*[@class="pui-countdown-hours"]'), null, { mode: LabelOptsMode.HtmlStripped }) public hours: number;
    @order(3) @label<string>(By.xpath('.//*[@class="pui-countdown-minutes"]'), null, { mode: LabelOptsMode.HtmlStripped }) public minutes: number;
    @order(2) @label<string>(By.xpath('.//*[@class="pui-countdown-seconds"]'), null, { mode: LabelOptsMode.HtmlStripped }) public seconds: number;
    @order(1) @customDecorator<Date>(async function () {
        let m = moment().add(this.target.days, 'd').add(this.target.hours, 'h').add(this.target.minutes + this.target.seconds ? 1 : 0, 'm');
        m.subtract(m.get('s'), 's');
        return m.toDate();
    }) public toDate: Date;
}

@injectable export class CreateTokenCountdown extends AbstractCountdownFeature {
    public featureSelector: Locator = By.xpath('.//*[@class="pui-countdown"]');
    public next(): Promise<Modal> {
        return oh.click(By.xpath('.//button'), this.element).then(() => Modal.WaitForPage<Modal>(Modal));
    }
}