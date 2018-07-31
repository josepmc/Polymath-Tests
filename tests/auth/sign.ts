import { given, binding, then } from 'cucumber-tsflow';
import { expect } from 'framework/helpers';
import { Welcome } from 'objects/pages/noToken/homepage/welcome';
import { SignPage } from 'objects/pages/noToken/sign/sign';
import { Ticker } from 'objects/pages/noToken/ticker/ticker';

@binding()
class SignTests {
    @given(/The issuer navigates to the issue url/)
    public async navigate() {
        let welcome = new Welcome();
        debugger;
        await welcome.navigateToPage();
        await welcome.next();
    }

    @given(/The issuer verifies the identity/)
    public async verifyIdentity() {
        let page = await new SignPage().load();
        await page.next();
    }

    @then(/The issuer is logged in/)
    public async loggedIn() {
        let ticker = await Ticker.WaitForPage<Ticker>(Ticker);
        expect(ticker).not.to.be.null;
    }

    // Run all the steps from this test case
    @given(/The issuer is authenticated/)
    public async authenticateFull() {
        await this.navigate();
        await this.verifyIdentity();
        await this.loggedIn();
    }
}

export = SignTests;