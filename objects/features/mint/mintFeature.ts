import { injectable } from "framework/object/core/iConstructor";
import { Locator, By, oh } from "framework/helpers";
import { AbstractFeature } from "framework/object/abstract";
import { inputField } from "framework/object/core/decorators";
import { Modal } from "objects/features/general/modal";


@injectable export class MintFeature extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[@class="mint-tokens-wrapper"]');
    @inputField<string>(By.xpath('.//input[@type="file"]')) public file: string;

    public mint(): Promise<Modal> {
        return oh.click(By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]'), this.element).then(() => Modal.WaitForPage<Modal>(Modal));
    }
    public skip(): Promise<Modal> {
        return oh.click(By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--secondary")]'), this.element).then(() => Modal.WaitForPage<Modal>(Modal));
    }
}