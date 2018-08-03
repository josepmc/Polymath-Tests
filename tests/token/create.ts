import { binding, given, then } from "cucumber-tsflow";
import { IssuerTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { CreateToken } from "objects/pages/withToken/token/createToken";
import { expect } from "framework/helpers";
import { TransactionResult } from "objects/features/general/transaction";
import { MintPage } from "objects/pages/withToken/token/mint";
import { Modal } from "objects/features/general/modal";
import { Providers } from "objects/pages/withToken/providers/providers";

@binding([IssuerTestData])
class CreateTokenTest extends IssuerTest {

    @given(/The issuer creates a token/)
    public async startNewToken() {
        let providers = await Providers.Get(Providers) as Providers;
        let modal = await providers.createToken.next();
        await modal.next(true); // I consulted with my advisors
        let page = await new CreateToken().navigation.navigate(CreateToken);
        expect(page).to.be.instanceof(CreateToken);
        await page.create.fill(this.data.tokenInfo);
        await this.approveTransactions(() => page.create.next());
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