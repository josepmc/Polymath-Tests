import { Locator, By, oh } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { PuppeteerWrapper } from "framework/object/wrapper/browser";
import { PageWithHeader } from "objects/pages/base";

@injectable export class SignPage extends PageWithHeader {
    protected featureSelector: Locator = By.xpath('//body[.//h2[text()="Digital Signature with Your Wallet"]]');
    public async next(): Promise<PageWithHeader> {
        let metamask = await (oh.browser as PuppeteerWrapper).handle.metamask;
        await metamask.confirmTransaction();
        return PageWithHeader.Get(PageWithHeader) as Promise<PageWithHeader>;
    }
}