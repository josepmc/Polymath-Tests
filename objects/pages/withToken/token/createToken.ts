import { injectable } from "framework/object/core/iConstructor";
import { Locator, By } from "framework/helpers";
import { TokenInfo } from "objects/features/token/tokenInfo";
import { BaseToken } from "./abstract";
import { CreateTokenFeature } from "objects/features/mint/createTokenFeature";


@injectable export class CreateToken extends BaseToken {
    protected featureSelector: Locator = By.xpath('self::*[.//*[@class="create-token-wrapper"]]');
    public create: CreateTokenFeature = new CreateTokenFeature(this);
    public tokenInfo: TokenInfo = new TokenInfo(this);
}