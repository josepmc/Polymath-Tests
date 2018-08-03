import { binding, given, then } from "cucumber-tsflow";
import { IssuerTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { MintPage } from "objects/pages/withToken/token/mint";
import { expect } from "framework/helpers";
import * as path from 'path';
import { TransactionResult } from "objects/features/general/transaction";
import { Modal } from "objects/features/general/modal";

@binding([IssuerTestData])
class MintToken extends IssuerTest {
    private page: MintPage;
    @given(/The issuer adds minting data/)
    public async startNewMinting() {
        this.page = await new MintPage().navigation.navigate(MintPage);
        expect(this.page).to.be.instanceof(MintPage);
        // TODO: Fix this
        this.page.mint.file = path.join(__dirname, 'file.csv');
        await this.page.apply();
    }

    @then(/The issuer mints new investors/)
    public async investorsAreMinted() {
        await this.approveTransactions(() => this.page.mint.mint());
    }

    @given(/Investors are minted/)
    public async createAToken() {
        await this.startNewMinting();
        // Skip this for now, fix upload
        //await this.investorsAreMinted();
    }
}

export = MintToken;