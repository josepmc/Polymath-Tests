import { AbstractFeature } from "framework/object/abstract";
import { Locator, By, oh } from "framework/helpers";
import { inputField } from "framework/object/core/decorators";
import { EmailHandler } from "helpers/email";
import { VerificationEmail } from "objects/pages/emails/verification";
import { CorePage } from "objects/pages/base";

class EmailConfirmed extends AbstractFeature {
    public featureSelector: Locator = By.xpath('//body[.//button[text()="CONTINUE WITH TOKEN CREATION"]]');
    public next(): Promise<CorePage> {
        return oh.click(By.xpath('.//button[contains(@class, "bx--btn--primary")][text()="CONTINUE WITH TOKEN CREATION"]'), this.element).then(() => CorePage.Get<CorePage>(CorePage));
    }
}

export class PinFeature extends AbstractFeature {
    public featureSelector: Locator = By.xpath('.//*[@role="dialog"][.//*[@name="pin"]]');
    @inputField<string>(By.xpath('.//*[@name="pin"]')) public pin: string;
    public close(): Promise<void> {
        return oh.click(By.xpath('.//*[@class="bx--modal-close"]'), this.element)
    }
    public async next(to: string, handler: EmailHandler): Promise<EmailConfirmed> {
        let message: string;
        while (!message) {
            // Do magic parse of the message
            let messages = await handler.fetchTo(to);
            if (!messages.length)
                await oh.browser.sleep(2);
            else message = messages[0];
        };
        let previousWindow = await oh.browser.window().open();
        let backupUrl = oh.browser.baseUrl;
        oh.browser.setBaseUrl('');
        await oh.get(`data:text/html,${message}`);
        let email = await VerificationEmail.Get(VerificationEmail) as VerificationEmail;
        await email.refresh();
        await oh.browser.window().close(previousWindow);
        oh.browser.setBaseUrl(backupUrl);
        this.pin = email.pin;
        await this.apply();
        return new EmailConfirmed().load();
    }
}

export class EmailValidationFeature extends AbstractFeature {
    public featureSelector: Locator = By.xpath('.//*[contains(@class,"confirm-email-form")]');
    @inputField<string>(By.xpath('.//*[@name="email"]')) public email: string;
    public next(): Promise<PinFeature> {
        return oh.click(By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]'), this.element).then(() => new PinFeature(this.parent).load());
    }
}