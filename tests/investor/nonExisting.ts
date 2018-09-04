import { TransactionalTest } from "../issuerTest";
import { binding, given, then } from "cucumber-tsflow/dist";
import { IssuerTestData } from "../issuerTestData";
import { InvestorSTONotFound } from "objects/pages/investor/notFound";
import { expect } from "framework/helpers";

@binding([IssuerTestData])
class NonExistingInvestorTests extends TransactionalTest {
    @given(/The investor navigates to an invalid token page/)
    public async invalidToken() {
        let page = new InvestorSTONotFound();
        await page.navigateToPage();
    }

    @then(/The investor is shown an invalid token page/)
    public async tokenIsInvalid() {
        let page = await InvestorSTONotFound
            .WaitForPage<InvestorSTONotFound>(InvestorSTONotFound);
        expect(page, `Token should not exist`).to.be.not.null;
    }
}

export = NonExistingInvestorTests;