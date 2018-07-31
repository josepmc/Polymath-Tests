import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh, TestConfig } from "framework/helpers";
import { inputField } from "framework/object/core/decorators";
import { PageWithToken } from "objects/pages/withToken/base";
import { EmailHandler } from "helpers/email";
import { VerificationEmail } from "objects/pages/emails/verification";

export class PinFeature extends AbstractFeature {
    public featureSelector: Locator = By.xpath('.//*[@role="dialog"][.//*[@name="pin"]]');
    @inputField<number>(By.xpath('.//*[@name="pin"]')) public pin: number;
    public async next(): Promise<PageWithToken> {
        if (await oh.present(this.element)) await this.apply(); // If we didn't apply it yet
        return PageWithToken.Get(PageWithToken) as Promise<PageWithToken>;
    }
    public close(): Promise<void> {
        return oh.click(this.element, By.xpath('.//*[@class="bx--modal-close"]'))
    }
    public async handleEmail(to: string) {
        let handler = new EmailHandler(TestConfig.instance.protractorConfig.emailConfig);
        let message: string = await oh.wait(async () => {
            // Do magic parse of the message
            let messages = await handler.fetchTo(to);
            if (messages.length > 0) return messages[0];
            await oh.browser.sleep(2);
        }, `Timeout waiting for verification email to arrive`);
        let previousWindow = await oh.browser.window().open();
        await oh.get(message);
        let email = await VerificationEmail.Get(VerificationEmail) as VerificationEmail;
        await email.refresh();
        await oh.browser.window().close(previousWindow);
        this.pin = email.pin;
        await this.apply();
    }
}

export class EmailValidationFeature extends AbstractFeature {
    public featureSelector: Locator = By.xpath('.//*[@class="confirm-email-form"]');
    @inputField<string>(By.xpath('.//*[@name="email"]')) public email: string;
    public next(): Promise<PinFeature> {
        return oh.click(this.element, By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]')).then(() => new PinFeature(this.parent).load());
    }
}