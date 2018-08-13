import { AbstractPage } from "framework/object/abstract";
import { Header } from "objects/features/general/header";
import { oh } from "framework/helpers";

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
}

export abstract class PageWithHeader extends CorePage {
    public header: Header = new Header(this);
}