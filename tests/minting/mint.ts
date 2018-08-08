import { binding, given, then } from "cucumber-tsflow";
import { IssuerTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { MintPage } from "objects/pages/withToken/token/mint";
import { expect } from "framework/helpers";
import { MintData } from "models/mint";
import { readFileSync, unlinkSync } from "fs";
import { join } from "path";

@binding([IssuerTestData])
class MintToken extends IssuerTest {
    private page: MintPage;
    @given(/The issuer adds minting data( with default data)?/)
    public async startNewMinting(defaultData?: string) {
        this.page = await new MintPage().navigation.navigate(MintPage);
        expect(this.page).to.be.instanceof(MintPage);
        if (defaultData) this.data.mint = await MintData.fromCsv(readFileSync(join(__dirname, 'file.csv'), 'utf8'));
        this.page.mint.file = this.data.mint.toFile();
        await this.page.apply();
        if (!defaultData) unlinkSync(this.page.mint.file);
    }

    @then(/The issuer mints new investors/)
    public async investorsAreMinted() {
        await this.approveTransactions(() => this.page.mint.mint(), null, false);
        let file = await this.page.tokenInfo.download();
        let data = await MintData.fromCsv(file.contents);
        let eq = await data.equals(this.data.mint);
        expect(eq, 'Minting data is not the same as uploaded').to.be.true;
    }

    @then(/The issuer skips minting/)
    public async skipMinting() {
        this.page = await new MintPage().navigation.navigate(MintPage);
        let modal = await this.page.mint.skip();
        await modal.next(true);
    }

    @given(/Investors are minted/)
    public async createAToken() {
        await this.startNewMinting();
        await this.investorsAreMinted();
    }
}

export = MintToken;