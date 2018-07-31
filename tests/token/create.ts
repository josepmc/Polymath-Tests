import { binding, given, then } from "cucumber-tsflow";
import { IssuerTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { CreateToken } from "objects/pages/withToken/token/createToken";
import { expect } from "framework/helpers";
import { TransactionResult } from "objects/features/general/transaction";
import { MintPage } from "objects/pages/withToken/token/mint";

@binding([IssuerTestData])
class CreateTokenTest extends IssuerTest {
    @given(/The issuer creates a token/)
    public async startNewToken() {
        let page = await new CreateToken().navigation.navigate(CreateToken);
        expect(page).to.be.instanceof(CreateToken);
        await page.create.fill(this.data.tokenInfo);
        let modal = await page.create.next();
        let transaction = await modal.confirm();
        let result;
        while ((result = await transaction.next()) instanceof TransactionResult) { }
    }

    @then(/The issuer has the token created/)
    public async tokenIsCreated() {
        let page = await MintPage.Get(MintPage);
        expect(page).to.be.instanceof(MintPage);
    }

    @given(/A token is created/)
    public async createAToken() {
        await this.startNewToken();
        await this.tokenIsCreated();
    }
}

export = CreateTokenTest;