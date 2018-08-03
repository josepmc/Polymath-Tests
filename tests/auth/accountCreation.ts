import { IssuerTest } from "tests/issuerTest";
import { given } from "cucumber-tsflow";
import { CorePage } from "objects/pages/base";
import { EmailVerification } from "objects/pages/noToken/account/emailVerification";
import { PageWithToken } from "objects/pages/withToken/base";
import { AccountPage } from "objects/pages/noToken/account/createAccount";
import { Ticker } from "objects/pages/noToken/ticker/ticker";
import { expect } from "framework/helpers";


export class AccountCreation extends IssuerTest {
    @given(/The issuer creates an account/)
    public async createAnAccount() {
        let page: AccountPage = await CorePage.Get(CorePage) as AccountPage;
        if (!(page instanceof AccountPage)) {
            console.warn('WARNING: An account already exists for the user, skipping creation.');
            return;
        }
        expect(page).to.be.instanceof(AccountPage);
        await page.account.fill(this.data.user);
        await page.account.next();
    }

    @given(/The issuer activates his account/)
    public async activateAccount() {
        let email = await CorePage.Get<CorePage>(CorePage) as EmailVerification;
        if (!(email instanceof EmailVerification)) {
            console.log('WARNING: Not activating account as it\'s already activated');
            return;
        }
        let pinInput = await email.verify.next();
        let confirmation = await pinInput.next(this.data.user.email, this.data.email);
        await confirmation.next();
    }
}