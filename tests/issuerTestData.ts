import { TickerModel } from "models/ticker";
import { IssuerModel } from "models/issuer";
import { CappedStoConfigModel } from "models/cappedStoConfig";
import { TokenInfoModel } from "models/tokenInfo";
import { EmailHandler } from "helpers/email";
import { TestConfig } from "framework/helpers";
import { WhitelistModel } from "models/whitelistModel";
import { MintData } from "models/mint";

// Defines a Token and all the related information
export class IssuerTestData {
    // A token has an user, that creates it
    public user: IssuerModel = new IssuerModel();

    // A token has ticker data, that identifies it
    public tickerData: TickerModel = new TickerModel();

    public generateTicker() {
        return this.tickerData = new TickerModel();
    }

    // A token has token info, that defines it
    public tokenInfo: TokenInfoModel = new TokenInfoModel();

    // A token has an STO
    public stoConfig: CappedStoConfigModel = new CappedStoConfigModel();

    public email: EmailHandler = new EmailHandler(TestConfig.instance.protractorConfig.emailConfig);

    public mint: MintData = new MintData();
    public whitelist: WhitelistModel = new WhitelistModel();
}