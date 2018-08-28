import { AbstractPage, optional } from "framework/object/abstract";
import { Header } from "objects/features/general/header";
import { oh } from "framework/helpers";
import { Notice } from "../features/general/notice";

export abstract class CorePage extends AbstractPage {
    public async navigateToPage(uri?: string): Promise<this> {
        await super.navigateToPage(uri);
        await this.initializeContracts();
        return this;
    }
    public async initializeContracts(contracts = process.env.GANACHE_CONTRACTS) {
        if (contracts) {
            await oh.browser.executeScript(`localStorage.setItem('polymath.js', '${JSON.stringify(JSON.parse(contracts))}')`);
        }
    }
    @optional public notice?: Notice = new Notice(this);
}

export abstract class PageWithHeader extends CorePage {
    public header: Header = new Header(this);
}