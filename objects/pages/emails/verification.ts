import { By, Locator } from "framework/helpers";
import { AbstractEmail } from "objects/pages/emails/abstract";
import { label } from "framework/object/core/decorators";

export class VerificationEmail extends AbstractEmail {
    public featureSelector: Locator = By.xpath('.//div[contains(@class,"wrapper")]');
    @label<number>(By.xpath('.//p[contains(@class,"value")]'), /(\d+)/) public pin: number;
}