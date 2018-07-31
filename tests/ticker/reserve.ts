import { binding, given, then } from "cucumber-tsflow";
import { TransactionResult } from "objects/features/general/transaction";
import { IssuerTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { expect, TestConfig } from "framework/helpers";
import { Ticker } from "objects/pages/noToken/ticker/ticker";
import { AccountPage } from "objects/pages/noToken/account/createAccount";
import { CorePage } from "objects/pages/base";
import { PageWithToken } from "objects/pages/withToken/base";

@binding([IssuerTestData])
class ReserveToken extends IssuerTest {
    @given(/The issuer fills in the token information/)
    public async fillInToken() {
        let ticker = await new Ticker().load();
        await ticker.ticker.fill(this.data.tickerData);
        let modal = await ticker.ticker.next();
        let transaction = await modal.confirm();
        let result;
        while ((result = await transaction.next()) instanceof TransactionResult) { }
    }

    @given(/The issuer creates an account/)
    public async createAnAccount() {
        let page: AccountPage = await CorePage.Get(CorePage) as AccountPage;
        expect(page instanceof AccountPage).to.be.true;
        await page.fill(this.data.user);
        let email = await page.account.next();
        let pinInput = await email.next();
        await pinInput.handleEmail(this.data.user.email);
        await pinInput.next();
    }

    @then(/The issuer has the token reserved/)
    public async tokenIsReserved() {
        let page = await CorePage.Get(CorePage);
        expect(page instanceof PageWithToken).to.be.true;
    }

    @given(/A token is reserved/)
    public async reserveAToken() {
        await this.fillInToken();
        await this.createAnAccount();
        await this.tokenIsReserved();
    }
}

export = ReserveToken;