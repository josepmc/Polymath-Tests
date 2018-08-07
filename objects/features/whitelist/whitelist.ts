import { AbstractFeature, optional } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { singleCheckbox, order, inputField } from "framework/object/core/decorators";
import { WhitelistModel } from "models/whitelistModel";
import { Modal } from "objects/features/general/modal";
import { CorePage } from "../../pages/base";
import { IssuerTest } from "tests/issuerTest";
import { DownloadedFile } from "config/download/abstract";

class WhitelistModal extends Modal {
    protected featureSelector: Locator = By.xpath('.//*[contains(@class, "whitelist-import-modal") and contains(@class, "is-visible")]');
    @inputField<string>(By.xpath('.//input[@type="file"]')) public file: string;
    public async cancel(): Promise<CorePage> {
        return oh.click(By.xpath('.//button[contains(@class, "bx--btn--secondary") and not(@for)]'), this.element).then(() => CorePage.Get(CorePage) as Promise<CorePage>);
    }
    public upload(file): Promise<void> {
        return oh.type(By.xpath('.//*[@id="id3"]'), file);
    }
}

export class WhitelistFeature extends AbstractFeature implements WhitelistModel {
    public featureSelector: Locator = By.xpath('.//*[@class="pui-page-box"][.//*[@class="compliance-settings"]]');
    @order(2) @singleCheckbox(By.xpath('.//label[@for="percentageToggle"][preceding-sibling::*[@id="percentageToggle"]]'),
        {
            checkedSelector: By.xpath('//*[@id="percentage"][not(ancestor::*[contains(@style,"display: none")])]'), postSet: async function () {
                if (this._val === false && this._val != this._oldVal) {
                    // We will have a Modal dialog popping in
                    await IssuerTest.ApproveTransactions(() => null, await Modal.WaitForPage<Modal>(Modal));
                }
            }
        }) public enableOwnershipPermissions: boolean;
    @order(1) @optional @inputField<number>(By.xpath('.//*[@id="percentage"]')) public maxOwnership?: number;
    public async next(): Promise<Modal> {
        // This is more of an 'apply', but we're setting a custom method here
        if (!this.enableOwnershipPermissions) return null;
        await oh.click(By.xpath('.//button[preceding-sibling::*[@for="percentage"]]'), this.element);
        return Modal.WaitForPage<Modal>(Modal);
    }
    public async import(): Promise<WhitelistModal> {
        await oh.click(By.xpath('.//*[contains(@class,"import-whitelist-btn") and contains(@class, "bx--btn--primary")]'), this.element);
        return new WhitelistModal().load();
    }
    public async download(acceptAndDownload: boolean = true): Promise<DownloadedFile> {
        let modal = await oh.click(By.xpath('.//*[contains(@class,"import-whitelist-btn") and contains(@class, "bx--btn--secondary")]'), this.element).then(() => Modal.Get<Modal>(Modal));
        if (acceptAndDownload) {
            await modal.next(true);
            return await oh.browser.downloadManager.waitForDownload("*.csv");
        }
    }
    data = undefined;
}