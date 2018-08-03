import { binding, given, then } from "cucumber-tsflow";
import { StoSelector } from "objects/pages/withToken/sto/selector";
import { CappedSto, CappedStoConfig } from "objects/features/sto/capped";
import { expect } from "framework/helpers";
import { IssuerTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { StoCountdown } from "objects/pages/withToken/sto/stoCountdown";
import { CorePage } from "objects/pages/base";

@binding([IssuerTestData])
class STOToken extends IssuerTest {
    @given(/The issuer selects the a Capped STO/)
    public async stoSelection() {
        let selector = await new StoSelector().navigation.navigate(StoSelector);
        await selector.init();
        let capped = selector.list.find(el => el instanceof CappedSto) as CappedSto;
        expect(capped).not.to.be.null;
        await capped.next();
    }

    @given(/The issuer configures and starts the Capped STO/)
    public async configureSTO() {
        let config: CappedStoConfig = await CappedStoConfig.Get(CappedStoConfig) as CappedStoConfig;
        await config.fill(this.data.stoConfig);
        await this.approveTransactions(() => config.next()); // Here we need to jump through the transactions...
    }

    @then(/The Capped STO is started/)
    public async stoIsStarted() {
        let page = await new StoCountdown().navigation.navigate(StoCountdown);
        expect(page).to.be.instanceof(StoCountdown);
    }

    @given(/Capped STO launched/)
    public async createAToken() {
        await this.stoSelection();
        await this.configureSTO();
        await this.stoIsStarted();
    }
}

export = STOToken;