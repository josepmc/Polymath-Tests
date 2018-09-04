import { PageWithHeader } from "objects/pages/base";
import { Locator, By, TestConfig } from "framework/helpers";
import { StoInfo } from "objects/features/sto/info";
import { IImplementable } from "framework/object/core";
import { InitOpts } from "framework/object/core/iConstructor";


export abstract class InvestorPage extends PageWithHeader {
    constructor(uri: string = TestConfig.instance.protractorConfig.apps.investor,
        element?: IImplementable<InitOpts>) {
        super(uri, element);
    }
    public navigateToPage(token?: string): Promise<this> {
        return super.navigateToPage(`${this.defaultPageUri}/${token}`);
    }
}

export abstract class InvestorWithSTO extends InvestorPage {
    public info: StoInfo = new StoInfo(this);
}