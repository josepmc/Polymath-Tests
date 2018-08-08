import { binding, given, then } from "cucumber-tsflow";
import { IssuerTestData } from "tests/issuerTestData";
import { expect, TestConfig } from "framework/helpers";
import { Ticker } from "objects/pages/noToken/ticker/ticker";
import { CorePage } from "objects/pages/base";
import { PageWithToken } from "objects/pages/withToken/base";
import { Modal } from "objects/features/general/modal";
import { TickerError } from "objects/features/ticker/ticker";
import { AccountCreation } from "../auth/accountCreation";

@binding([IssuerTestData])
class ReserveToken extends AccountCreation {
    @given(/The issuer fills in the token information/)
    public async fillInToken() {
        let ticker = await new Ticker().load();
        await ticker.ticker.fill(this.data.tickerData);
        let error = await ticker.ticker.next();
        while (error instanceof TickerError) {
            // The token is already present
            ticker.ticker.symbol = this.data.generateTicker().symbol;
            await ticker.ticker.apply();
            error = await ticker.ticker.next();
        }
        await this.approveTransactions(() => ticker.ticker.next() as Promise<Modal>, error as Modal);
    }

    @then(/The issuer has the token reserved/)
    public async tokenIsReserved() {
        let page = await CorePage.Get(CorePage);
        //expect(page).to.be.instanceof(PageWithToken);
    }

    @given(/A token is reserved/)
    public async reserveAToken() {
        await this.fillInToken();
        await this.activateAccount();
        await this.tokenIsReserved();
    }
}

export = ReserveToken;