import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { NoticeModel, NoticeType } from "helpers/mongo";
import { label, present, LabelOptsMode } from "framework/object/core/decorators";

export class NoticeFeature extends AbstractFeature implements NoticeModel {
    protected featureSelector: Locator = By.xpath('.//*[@class="pui-navbar pui-navbar-notice"]');
    @label<string>(By.xpath('.//*[@class="pui-notice-bar-title"]'), null, { mode: LabelOptsMode.Text }) public title: string;
    @present(By.xpath('self::*'), {
        './/*[contains(@class, "pui-notice-bar-error")]': NoticeType.error,
        './/*[contains(@class, "pui-notice-bar-info")]': NoticeType.info,
        './/*[contains(@class, "pui-notice-bar-warning")]': NoticeType.warning,
    }) public type: NoticeType;
    @label<string>(By.xpath('.//*[@class="pui-notice-bar-text"]'), null, { mode: LabelOptsMode.Text }) public content: string;

    public next() {
        return oh.click(By.xpath('.//*[@class="pui-notice-bar-close"]'), this.element);
    }

    // Ignore
    isOneTime;
    isValid;
    scope;
    mongo;
}