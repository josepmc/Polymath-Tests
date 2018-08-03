import { binding, given, then } from "cucumber-tsflow";
import { IssuerTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { Whitelist } from "objects/pages/withToken/compliance/whitelist";
import { expect } from "framework/helpers";
import * as path from 'path';
import { Modal } from "objects/features/general/modal";

@binding([IssuerTestData])
class ComplianceTest extends IssuerTest {
    @given(/The issuer changes ownership settings/)
    public async newInvestor() {
        let whitelist = await new Whitelist().navigation.navigate(Whitelist);
        expect(whitelist).to.be.not.null;
        await whitelist.whitelist.fill(this.data.whitelist);
        let modal = await whitelist.whitelist.next();
        if (modal) await this.approveTransactions(() => whitelist.whitelist.next(), modal);
    }

    @given(/The issuer adds investors to the whitelist/)
    public async removesInvestor() {
        let whitelist = await new Whitelist().navigation.navigate(Whitelist);
        expect(whitelist).to.be.not.null;
        let modal = await whitelist.whitelist.import();
        modal.file = path.join(__dirname, 'file.csv');
        await modal.apply();
        await this.approveTransactions(() => modal.next() as Promise<Modal>);
    }

    @then(/The whitelist remains unmodified/)
    public async modifyWhitelist() {
        await this.newInvestor();
        await this.removesInvestor();
    }
}

export = ComplianceTest;