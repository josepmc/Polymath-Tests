import { TransactionalTest } from "../issuerTest";
import { binding, given, then } from "cucumber-tsflow/dist";
import { IssuerTestData } from "../issuerTestData";
import { expect, oh } from "framework/helpers";
import { WaitForSTO } from "objects/pages/investor/waitForSto";
import { Metamask } from "extensions/metamask";
import * as moment from 'moment';
import { ActiveSTO } from "objects/pages/investor/activeSTO";
import { AllowedToInvest } from "objects/features/investor/allowed";
import { InvestorPage } from "objects/pages/investor/base";

@binding([IssuerTestData])
class InvestTests extends TransactionalTest {
    @given(/The investor selects the account number (\d+)/)
    public async selectAccount(account: number) {
        await Metamask.instance.switchAccount(account);
    }

    @given(/The investor navigates to a valid token page/)
    public async validToken() {
        let page = new WaitForSTO();
        await page.navigateToPage(this.data.tickerData.symbol);
        page = await InvestorPage.WaitForPage<InvestorPage>(InvestorPage) as WaitForSTO;
        await oh.browser.sleep(4);
    }

    @then(/The investor waits for the STO to start/)
    public async waitForSto() {
        let page = await InvestorPage.WaitForPage<InvestorPage>(InvestorPage) as WaitForSTO;
        if (page instanceof ActiveSTO) {
            console.log('The STO has started already, skipping...');
            return;
        }
        expect(page, `Expected STO to not have started yet`).to.be.instanceOf(WaitForSTO);
        await page.init();
        let endDate = moment(page.countdown.toDate);
        let currentDate: moment.Moment = moment();
        console.log(`STO starts '${endDate.toLocaleString()}', we're currently at '${currentDate.toLocaleString()}'`);
        while ((currentDate = moment()).get('s') < endDate.get('s')) {
            console.log(`Waiting ${endDate.get('s') - currentDate.get('s')} seconds`);
            await oh.browser.sleep(30);
            await oh.refresh();
        }
        page = await ActiveSTO.WaitForPage<ActiveSTO>(ActiveSTO);
        expect(page, `STO didn't start`).to.be.not.null;
    }

    @then(/The investor invests (\d+) token/)
    public async investTokens(numberTokens: number) {
        let page = await ActiveSTO.Get<ActiveSTO>(ActiveSTO);
        expect(page, `Expected STO to be active`).to.be.instanceOf(ActiveSTO);
        let modal = await page.next() as AllowedToInvest;
        expect(modal, `Investor is not allowed to invest`).to.be.instanceof(AllowedToInvest);
        modal.tokens = numberTokens;
        await modal.apply();
        await this.approveTransactions(null, modal);
    }
}

export = InvestTests;