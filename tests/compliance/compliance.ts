import { binding, given, then } from "cucumber-tsflow";
import { TransactionalTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { Whitelist } from "objects/pages/withToken/compliance/whitelist";
import { expect, oh } from "framework/helpers";
import { Modal } from "objects/features/general/modal";
import { ComplianceData } from "models/whitelistModel";
import { readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { Metamask } from "extensions/metamask";
import { SignPage } from "objects/pages/noToken/sign/sign";

@binding([IssuerTestData])
class ComplianceTest extends TransactionalTest {
    @given(/The issuer changes ownership settings/)
    public async ownershipChange() {
        let whitelist = await new Whitelist().navigation.navigate(Whitelist);
        expect(whitelist).to.be.not.null;
        await whitelist.whitelist.fill(this.data.whitelist);
        let modal = await whitelist.whitelist.next();
        if (modal) await this.approveTransactions(() => whitelist.whitelist.next(), modal);
    }

    private file: string;
    @given(/The issuer adds investors to the whitelist( with default data)?/)
    public async addInvestors(defaultData?: string) {
        let whitelist = await new Whitelist().navigation.navigate(Whitelist);
        expect(whitelist).to.be.not.null;
        let modal = await whitelist.whitelist.import();
        if (defaultData) this.data.whitelist.data = await ComplianceData.fromCsv(readFileSync(join(__dirname, 'file.csv'), 'utf8'));
        modal.file = this.data.whitelist.data.toFile();
        await modal.apply();
        await this.approveTransactions(() => modal.next() as Promise<Modal>);
        if (!defaultData) unlinkSync(modal.file);
    }

    @given(/(\d+) known addresses are whitelisted/)
    public async addKnownInvestors(numberInvestors: number) {
        let currentPage = await oh.browser.getCurrentUrl();
        await oh.get('about:blank'); // Disable sign in popups
        let currentAccount = await Metamask.instance.accountInfo();
        let accounts: string[] = [];
        for (let i = 1; i <= numberInvestors; ++i) {
            await Metamask.instance.switchAccount(i);
            let info = await Metamask.instance.accountInfo();
            accounts.push(info.ethAddress);
        }
        this.data.whitelist.data = ComplianceData.fromAddresses(accounts);
        await Metamask.instance.switchAccount(currentAccount.name);
        await oh.get(currentPage);
        let page = await new SignPage().load();
        await page.next();
        let whitelist = await new Whitelist().navigation.navigate(Whitelist);
        expect(whitelist).to.be.not.null;
        let modal = await whitelist.whitelist.import();
        modal.file = this.data.whitelist.data.toFile();
        await modal.apply();
        await this.approveTransactions(() => modal.next() as Promise<Modal>);
        unlinkSync(modal.file);
    }

    @then(/The issuer downloads the same investors/)
    public async downloadInvestors() {
        let whitelist = await new Whitelist().load();
        let file = await whitelist.whitelist.download();
        let data = await ComplianceData.fromCsv(file.contents);
        let old = this.data.whitelist.data.addresses;
        let combined = this.data.mint.addresses.concat(this.data.whitelist.data.addresses as any);
        // TODO: Look for duplicates
        this.data.whitelist.data.addresses = combined as any;
        let eq = await data.equals(this.data.whitelist.data);
        this.data.whitelist.data.addresses = old;
        expect(eq, 'Investors data is not the same as uploaded').to.be.true;
    }

    @then(/The whitelist remains unmodified/)
    public async modifyWhitelist() {
        await this.ownershipChange();
        await this.addInvestors();
    }
}

export = ComplianceTest;