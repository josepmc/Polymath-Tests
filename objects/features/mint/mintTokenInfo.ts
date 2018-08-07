import { AbstractTokenInfo } from "../token/tokenInfo";
import { Locator, By, oh } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { order, singleCheckbox, inputField } from "framework/object/core/decorators";
import { optional } from "framework/object/abstract";
import { DownloadedFile } from "config/download/abstract";
import { Modal } from "objects/features/general/modal";


@injectable export class MintTokenInfo extends AbstractTokenInfo {
    protected featureSelector: Locator = By.xpath('.//*[@class="token-symbol-wrapper"][.//*[@id="maxHoldersCount"]]');
    @order(2) @singleCheckbox(By.xpath('.//*[@for="investors-number-toggle"]'), { checkedSelector: By.xpath('//*[@id="maxHoldersCount"][not(ancestor::*[contains(@style,"display: none")])]') }) public allowMaxInvestors: boolean;
    @order(1) @optional @inputField<number>(By.xpath('.//*[@id="maxHoldersCount"]')) public maxInvestors?: number;
    public async download(acceptAndDownload: boolean = true): Promise<DownloadedFile> {
        let modal = await oh.click(By.xpath('.//*[contains(@class, "bx--btn--secondary")]'), this.element).then(() => Modal.Get<Modal>(Modal));
        if (acceptAndDownload) {
            await modal.next(true);
            return await oh.browser.downloadManager.waitForDownload("*.csv");
        }
    }
}