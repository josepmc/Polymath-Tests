import { MetamaskPage } from "..";
import { Locked } from "../locked";
import { oh, By } from "framework/helpers";
import { Detail } from "../account/detail";


export abstract class TermsAndConditions extends MetamaskPage {
    public abstract next(lookForNext?: boolean): Promise<TermsAndConditions | Locked | Detail>;
    protected async scrollToEnd() {
        await oh.browser.executeScript(`arguments[0].scroll(0, arguments[0].scrollHeight)`,
            await (await oh.by(By.xpath('.//div[contains(@class, "markdown")]'), this.element))
                .getWebElement());
    }
    public async skipTou(): Promise<MetamaskPage> {
        let page: TermsAndConditions = this;
        while (page instanceof TermsAndConditions)
            page = await page.next() as TermsAndConditions;
        return page;
    }
}