import { AbstractFeature, forceVisibility } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { label, attribute, present, LabelOptsMode } from "framework/object/core/decorators";
import { inject, injectable } from "framework/object/core/iConstructor";
import { Metamask } from "extensions/metamask";
import { CorePage } from "objects/pages/base";

export enum Status {
    Pass, Fail, Loading
}

@injectable export class TransactionResult extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[contains(@class, "pui-tx-row")]');
    @label<string>(By.xpath('.//*[@class="pui-h3"]'), null, { mode: LabelOptsMode.Text }) public name: string;
    @attribute('href', By.xpath('.//a')) public ethscan: string;
    @present(By.xpath('.//*[@class="pui-tx-icon"]'), {
        './/*[@name="checkmark"]': Status.Pass,
        './/*[@name="close"]': Status.Fail,
        './/*[@class="bx--loading"]': Status.Loading,
    }) public status: Status;
    public async waitForCompletion() {
        await oh.wait(async () => {
            await this.refresh('status');
            return (this.status === Status.Pass) || (this.status === Status.Fail);
        }, `Timeout waiting for the transaction ${this.name} to complete`);
    }
    public async waitForLoading() {
        if (this.status === undefined)
            await oh.wait(async () => {
                await this.refresh('status');
                return this.status === Status.Loading;
            }, `Timeout waiting for the transaction ${this.name} to start`);
    }
}

// TODO: Make this more flexible, cancelling transactions and such
@injectable @forceVisibility export class Transaction extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[contains(@class, "pui-tx-modal")][.//*[@class="pui-tx-continue"]]');
    @present(By.xpath('self::*[contains(@class, "pui-tx-failed")]')) public failed: boolean;
    @inject(TransactionResult, { multiInstance: true }) public transactions: TransactionResult[];
    public async next(lookForNext: boolean = true): Promise<CorePage | TransactionResult> {
        // If continue is not present, return handleTransaction(true)
        let button = By.xpath('.//*[@class="pui-tx-continue"]/button');
        if (await oh.visible(button)()) {
            await oh.click(button);
            if (lookForNext) return await CorePage.WaitForPage(CorePage) as CorePage;
            else return null;
        } else return await this.handleTransaction();
    }
    public async handleTransaction(cancel: boolean = false): Promise<TransactionResult> {
        // TODO: Implement transaction cancelling
        //if (!this.transactions) // We weren't init
        await this.refresh('transactions', true);
        // Transactions are ordered
        for (let transaction of this.transactions) {
            switch (transaction.status) {
                case undefined:
                    await transaction.waitForLoading();
                    break;
                case Status.Loading:
                    await Metamask.instance.confirmTransaction();
                    await transaction.waitForCompletion();
                    return transaction;
                case Status.Fail:
                    console.log(`Transaction ${transaction.name} has failed. Ethscan: ${transaction.ethscan}`);
            }
        }
        return null;
    }
}