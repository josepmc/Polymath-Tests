import { binding, given, then } from "cucumber-tsflow";
import { StoSelector } from "objects/pages/withToken/sto/selector";
import { CappedSto, CappedStoConfig } from "objects/features/sto/capped";
import { expect } from "framework/helpers";
import { TransactionalTest } from "tests/issuerTest";
import { IssuerTestData } from "tests/issuerTestData";
import { StoCountdown } from "objects/pages/withToken/sto/stoCountdown";
import { CappedStoConfigModel } from "models/cappedStoConfig";

@binding([IssuerTestData])
class STOToken extends TransactionalTest {
    @given(/The issuer selects the a Capped STO/)
    public async stoSelection() {
        let selector = await new StoSelector().navigation.navigate(StoSelector);
        await selector.init();
        let capped = selector.list.find(el => el instanceof CappedSto) as CappedSto;
        expect(capped).not.to.be.null;
        await capped.next();
    }

    @given(/The issuer configures and starts the Capped STO/)
    public async configureSTO(immediate?: string) {
        let config: CappedStoConfig = await CappedStoConfig.WaitForPage(CappedStoConfig) as CappedStoConfig;
        if (immediate) CappedStoConfigModel.startNow(this.data.stoConfig);
        await config.fill(this.data.stoConfig);
        await this.approveTransactions(() => config.next()); // Here we need to jump through the transactions...
    }

    @then(/The Capped STO is started/)
    public async stoIsStarted() {
        let page = await new StoCountdown().navigation.navigate(StoCountdown);
        expect(page).to.be.instanceof(StoCountdown);
    }

    @given(/Capped STO launched( immediately)?/)
    public async createAToken(immediate?: string) {
        await this.stoSelection();
        await this.configureSTO(immediate);
        await this.stoIsStarted();
    }
}

export = STOToken;