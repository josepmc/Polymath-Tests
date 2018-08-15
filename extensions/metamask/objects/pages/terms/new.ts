import { injectable } from "framework/object/core/iConstructor";
import { TermsAndConditions } from ".";
import { Locator, By, oh } from "framework/helpers";
import { Locked } from "../locked";
import { Detail } from "../account/detail";

// Inherit from TermsAndCondtions to keep the flow
@injectable export class NewVersionAnnouncement extends TermsAndConditions {
    protected featureSelector: Locator = By.xpath('self::*[.//*[@class="new-ui-announcement"]]');
    public async next(lookForNext: boolean = true): Promise<WelcomeMetamaskBeta> {
        let oldFn = await oh.browser.window()
            .waitForNewWindow(() => oh.click(By.xpath('.//*[@class="positive"]'), this.element));
        await oh.browser.window().close(oldFn);
        return lookForNext && WelcomeMetamaskBeta
            .WaitForPage<WelcomeMetamaskBeta>(WelcomeMetamaskBeta);
    }
    public async skip(lookForNext: boolean = true,
        locator: Locator = By.xpath('.//*[@class="negative"]')): Promise<TermsAndConditions | Locked> {
        return oh.click(locator, this.element)
            .then(() => lookForNext && TermsAndConditions
                .WaitForPage<TermsAndConditions>([TermsAndConditions, Locked]));
    }
    public async close(lookForNext: boolean = true): Promise<TermsAndConditions | Locked> {
        return this.skip(lookForNext, By.xpath('.//*[@class="close"]'));
    }
}

@injectable export class WelcomeMetamaskBeta extends TermsAndConditions {
    protected featureSelector: Locator = By.xpath('self::*[.//*[@class="first-time-flow"]]');
    public async next(lookForNext: boolean = true): Promise<Locked> {
        return oh.click(By.xpath('.//button'), this.element)
            .then(() => lookForNext && Locked
                .WaitForPage<Locked>([Locked, NewTerms, Detail]));
    }
}

@injectable export class NewTerms extends TermsAndConditions {
    protected featureSelector: Locator = By.xpath('self::*[.//*[@class="tou"]]');
    public async next(lookForNext: boolean = true): Promise<TermsAndConditions | Detail> {
        await this.scrollToEnd();
        return oh.click(By.xpath('.//button'), this.element)
            .then(() => lookForNext && TermsAndConditions
                .WaitForPage<TermsAndConditions>([TermsAndConditions, Detail]));
    }
}