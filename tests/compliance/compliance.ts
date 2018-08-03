import { binding, given, then } from "cucumber-tsflow";
import { IssuerTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";

@binding([IssuerTestData])
class MintToken extends IssuerTest {
    @given(/The issuer whitelists a new investor/)
    public async newInvestor() {
        debugger;
    }

    @given(/The issuer removes the investor from the whitelist/)
    public async removesInvestor() {

    }

    @then(/The whitelist remains unmodified/)
    public async modifyWhitelist() {
        await this.newInvestor();
        await this.removesInvestor();
    }
}

export = MintToken;