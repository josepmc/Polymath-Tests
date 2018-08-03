import { By, Locator } from "framework/helpers";
import { AbstractEmail } from "objects/pages/emails/abstract";
import { label, LabelOptsMode } from "framework/object/core/decorators";
import { injectable } from "framework/object/core/iConstructor";

@injectable export class VerificationEmail extends AbstractEmail {
    public featureSelector: Locator = By.xpath('.//div[@class="wrapper"]');
    @label<string>(By.xpath('.//p[@class="value"]'), null, { mode: LabelOptsMode.Text }) public pin: string;
}