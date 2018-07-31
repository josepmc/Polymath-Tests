import { binding, given, then } from "cucumber-tsflow";
import { IssuerTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { MintPage } from "objects/pages/withToken/token/mint";
import { expect } from "framework/helpers";
import * as path from 'path';
import { TransactionResult } from "objects/features/general/transaction";

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
        let modal = await this.page.mint.mint();
        let transaction = await modal.confirm();
        let result;
        while ((result = await transaction.next()) instanceof TransactionResult) { }
    }

    @given(/Investors are minted/)
    public async createAToken() {
        await this.startNewMinting();
        await this.investorsAreMinted();
    }
}

export = MintToken;