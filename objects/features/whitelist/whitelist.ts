import { AbstractFeature, optional } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { singleCheckbox, order, inputField, present } from "framework/object/core/decorators";
import { WhitelistModel } from "models/whitelistModel";
import { Modal } from "objects/features/general/modal";
import { TransactionalTest } from "tests/transactionalTest";
import { DownloadedFile } from "config/download/abstract";

export class WhitelistModal extends Modal {
    protected featureSelector: Locator = By.xpath('.//*[contains(@class, "whitelist-import-modal") and contains(@class, "is-visible")]');
    @present(By.xpath('.//button[@type="submit" and @disabled]')) public hasError: boolean;
    @inputField<string>(By.xpath('.//input[@type="file"]')) public file: string;
}

export class WhitelistFeature extends AbstractFeature implements WhitelistModel {
    public featureSelector: Locator = By.xpath('.//*[@id="compliance"]');
    @order(2) @singleCheckbox(By.xpath('.//label[@for="percentageToggle"][preceding-sibling::*[@id="percentageToggle"]]'),
        {
            checkedSelector: By.xpath('//*[@id="percentage"][not(ancestor::*[contains(@style,"display: none")])]'), postSet: async function () {
                if (this._val === false && this._val != this._oldVal) {
                    // We will have a Modal dialog popping in
                    await TransactionalTest.ApproveTransactions(() => null, await Modal.WaitForPage<Modal>(Modal));
                }
            }
        }) public enableOwnershipPermissions: boolean;
    @order(1) @optional @inputField<number>(By.xpath('.//*[@id="percentage"]')) public maxOwnership?: number;
    public async next(): Promise<Modal> {
        // This is more of an 'apply', but we're setting a custom method here
        if (!this.enableOwnershipPermissions) return null;
        await oh.click(By.xpath('.//*[contains(@class, "apply-percentage-btn")]'), this.element);
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