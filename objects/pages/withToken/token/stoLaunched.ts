import { injectable } from "framework/object/core/iConstructor";
import { Locator, By } from "framework/helpers";
import { TokenInfo } from "objects/features/token/tokenInfo";
import { BaseToken } from "./abstract";


@injectable export class StoLaunched extends BaseToken {
    protected featureSelector: Locator = By.xpath('self::*[not(.//*[@class="mint-tokens-wrapper"])]');
    public tokenInfo: TokenInfo = new TokenInfo(this);
}