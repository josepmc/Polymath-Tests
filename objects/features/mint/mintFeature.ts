import { injectable } from "framework/object/core/iConstructor";
import { Locator, By, oh } from "framework/helpers";
import { AbstractFeature } from "framework/object/abstract";
import { inputField } from "framework/object/core/decorators";
import { BaseSto } from "objects/pages/withToken/sto/abstract";
import { Modal } from "objects/features/general/modal";


@injectable export class MintFeature extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[@class="mint-tokens-wrapper"]');
    @inputField<string>(By.xpath('.//*[@id="id8"]')) public file: string;
    public async download() {
        // TODO: Handle file downloads
        return oh.click(By.xpath('.//*[@download]'), this.element);
    }
    public mint(): Promise<Modal> {
        return oh.click(By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--primary")]'), this.element).then(() => Modal.Get<Modal>(Modal));
    }
    public skip(): Promise<BaseSto> {
        return oh.click(By.xpath('.//button[@type="submit" and contains(@class, "bx--btn--secondary")]'), this.element).then(() => BaseSto.Get(BaseSto) as Promise<BaseSto>);
    }
}