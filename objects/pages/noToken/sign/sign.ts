import { Locator, By, oh } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { PuppeteerWrapper } from "framework/object/wrapper/browser";
import { PageWithHeader } from "objects/pages/base";
import { Metamask } from "extensions";

@injectable export class SignPage extends PageWithHeader {
    protected featureSelector: Locator = By.xpath('//body[.//h2[text()="Sign In with Your Wallet"]]');
    public async next(): Promise<PageWithHeader> {
        await Metamask.instance.confirmTransaction();
        return PageWithHeader.Get(PageWithHeader) as Promise<PageWithHeader>;
    }
}