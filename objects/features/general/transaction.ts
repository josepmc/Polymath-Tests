import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { PageWithToken } from "objects/pages/withToken/base";
import { PuppeteerWrapper } from "framework/object/wrapper/browser";
import { label, attribute, present } from "framework/object/core/decorators";
import { inject, injectable } from "framework/object/core/iConstructor";
import { Metamask } from "extensions/metamask";

enum Status {
    Pass, Fail, Loading
}

@injectable export class TransactionResult extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[@class="pui-tx-row"]');
    @label(By.xpath('.//*[@class="pui-h3"]')) public name: string;
    @attribute('href', By.xpath('.//a')) public ethscan: string;
    @present('.//*[@class="pui-tx-icon"]', {
        './/*[@name="checkmark"]': Status.Pass,
        './/*[@name="close"]': Status.Fail,
        './/*[@class="bx--loading"]': Status.Loading,
    }) public status: Status;
}

// TODO: Make this more flexible, cancelling transactions and such
export class Transaction extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[@class="bx--modal-container"][.//*[@class="bx--modal-header__label" and text()="Transaction Processing"]]');
    @inject(TransactionResult, { multiInstance: true }) public transactions: TransactionResult[];
    public async next(): Promise<PageWithToken | TransactionResult> {
        // if Continue is not present, return handleTransaction(true)
        let button = By.xpath('.//*[@class="pui-tx-continue"]');
        if (await oh.visible(this.element, button)) {
            await oh.click(this.element, button);
            return PageWithToken.Get(PageWithToken) as Promise<PageWithToken>;
        }
        return await this.handleTransaction();
    }
    public async handleTransaction(cancel: boolean = false): Promise<TransactionResult> {
        // TODO: Implement transaction cancelling
        await Metamask.instance.confirmTransaction();
        for (let transaction of this.transactions) {
            if (transaction.status === Status.Loading) {
                return await transaction.refresh();
            }
        }
        return null;
    }
}