import { TickerModel } from "models/ticker";
import { IssuerModel } from "models/issuer";
import { CappedStoConfigModel } from "models/cappedStoConfig";
import { TokenInfoModel } from "models/tokenInfo";

// Defines a Token and all the related information
export class IssuerTestData {
    // A token has an user, that creates it
    public user: IssuerModel = new IssuerModel();

    // A token has ticker data, that identifies it
    public tickerData: TickerModel = new TickerModel();

    // A token has token info, that defines it
    public tokenInfo: TokenInfoModel = new TokenInfoModel();

    // A token has an STO
    public stoConfig: CappedStoConfigModel = new CappedStoConfigModel();
}