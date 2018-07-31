import { AbstractFeature, AbstractPage } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { Transaction } from "objects/features/general/transaction";
import { present } from "framework/object/core/decorators";
import { CorePage } from "objects/pages/base";

export class Modal extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[contains(@class, "bx--modal") and contains(@class, "is-visible")]');
    @present(By.xpath('.//*[@class="bx--modal-close"]')) public hasClose: boolean;
    public close(): Promise<CorePage> {
        return oh.click(this.element, By.xpath('.//button[@class="bx--modal-close"]')).then(() => CorePage.Get(CorePage) as Promise<CorePage>);
    }
    public confirm(): Promise<Transaction> {
        return oh.click(this.element, By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]')).then(() => new Transaction().load());
    }
    public cancel(): Promise<CorePage> {
        return oh.click(this.element, By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--secondary")]')).then(() => CorePage.Get(CorePage) as Promise<CorePage>);
    }
}