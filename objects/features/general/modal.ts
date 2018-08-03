import { AbstractFeature, AbstractPage, forceVisibility } from "framework/object/abstract";
import { Locator, By, oh, assert } from "framework/helpers";
import { Transaction, TransactionResult, Status } from "objects/features/general/transaction";
import { present } from "framework/object/core/decorators";
import { CorePage } from "objects/pages/base";
import { injectable } from "framework/object/core/iConstructor";

export abstract class Modal extends AbstractFeature {
    @present(By.xpath('.//*[@class="bx--modal-close"]')) public hasClose: boolean;
    public close(): Promise<CorePage> {
        return oh.click(By.xpath('.//button[@class="bx--modal-close"]'), this.element).then(() => CorePage.Get(CorePage) as Promise<CorePage>);
    }
    public async confirm(noNext: boolean = false): Promise<Transaction | Modal> {
        await oh.click(By.xpath('.//button[contains(@class, "bx--btn--primary")]'), this.element);
        if (noNext) return;
        let page = await Transaction.WaitForPage([Transaction, Modal], false, this.parent) as Modal | Transaction;
        return page;
    }
    // Placeholder
    public async next(noNext: boolean = false): Promise<Transaction | Modal> {
        return this.confirm(noNext);
    }
    public cancel(): Promise<CorePage> {
        return oh.click(By.xpath('.//button[contains(@class, "bx--btn--secondary")]'), this.element).then(() => CorePage.Get(CorePage) as Promise<CorePage>);
    }
}

@injectable @forceVisibility export class NormalModal extends Modal {
    protected featureSelector: Locator = By.xpath('.//*[contains(@class, "bx--modal") and contains(@class, "is-visible")][not(.//*[@class="pui-tx-row"])][not(.//button[contains(text(),"REQUEST") and contains(text(),"POLY")])]');
}

@injectable @forceVisibility export class PolyModal extends Modal {
    protected featureSelector: Locator = By.xpath('.//*[contains(@class, "bx--modal") and contains(@class, "is-visible")][not(.//*[@class="pui-tx-row"])][.//button[contains(text(),"REQUEST") and contains(text(),"POLY")]]');
    public async handleTransaction() {
        let t = await this.next();
        let tr = await t.next() as TransactionResult;
        assert(tr.status === Status.Pass);
        await t.next(); // Continue
    }
}