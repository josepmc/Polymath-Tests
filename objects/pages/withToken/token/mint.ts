import { injectable } from "framework/object/core/iConstructor";
import { Locator, By } from "framework/helpers";
import { MintFeature } from "objects/features/mint/mintFeature";
import { BaseToken } from "./abstract";
import { MintTokenInfo } from "objects/features/mint/mintTokenInfo";


@injectable export class MintPage extends BaseToken {
    protected featureSelector: Locator = By.xpath('self::*[.//*[@class="mint-tokens-wrapper"]]');
    public mint: MintFeature = new MintFeature(this);
    public tokenInfo: MintTokenInfo = new MintTokenInfo(this);
}