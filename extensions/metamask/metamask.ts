import { oh, WindowInfo, RunnerConfig } from "framework/helpers";
import { ExtensionManager, Extension } from "../extensionManager";
import { MetamaskDownloader } from "./browsers";
import { MetamaskOptions, Network } from "./shared";
import { ExtensionConfig, ExtensionBrowser, ExtensionData } from "../shared";
import { InitMode } from "framework/object/core/iConstructor";
import { MetamaskPage } from "./objects/pages";
import { Locked } from "./objects/pages/locked";
import { TermsAndConditions } from "./objects/pages/terms";
import { Create } from "./objects/pages/account/create";
import { Detail } from "./objects/pages/account/detail";
import { Transaction } from "./objects/pages/transaction";


export class Metamask extends Extension {
    private static key: string = 'METAMASK_UNIQUE_CONFIG_KEY';
    public getConfig(): ExtensionConfig {
        return { key: Metamask.key, config: this.options };
    }
    public async getExtension(browser: ExtensionBrowser): Promise<ExtensionData> {
        let extension = await MetamaskDownloader.Get(browser);
        this.options.extensionId = extension.extensionId;
        return extension;
    }
    private options: MetamaskOptions = {
        // If you want to use the following extension id, set this key in your manifest.json
        // "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlcgI4VVL4JUvo6hlSgeCZp9mGltZrzFvc2Asqzb1dDGO9baoYOe+QRoh27/YyVXugxni480Q/R147INhBOyQZVMhZOD5pFMVutia9MHMaZhgRXzrK3BHtNSkKLL1c5mhutQNwiLqLtFkMSGvka91LoMEC8WTI0wi4tACnJ5FyFZQYzvtqy5sXo3VS3gzfOBluLKi7BxYcaUJjNrhOIxl1xL2qgK5lDrDOLKcbaurDiwqofVtAFOL5sM3uJ6D8nOO9tG+T7hoobRFN+nxk43PHgCv4poicOv+NMZQEk3da1m/xfuzXV88NcE/YRbRLwAS82m3gsJZKc6mLqm4wZHzBwIDAQAB",
        extensionId: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
    }
    public get extensionUrl() { return `chrome-extension://${this.options.extensionId}/popup.html`; }
    public static get instance(): Metamask {
        let capabilities = oh.browser.getCapabilities();
        let instance = capabilities.get(Metamask.key);
        if (!instance) {
            instance = new Metamask();
            capabilities.set(Metamask.key, instance);
        }
        return instance;
    }
    public constructor() {
        super();
        if (oh.browser) {
            // Try load the configuration
            let config = oh.browser.getProcessedConfig() as RunnerConfig;
            if (config.extraConfig &&
                config.extraConfig.extensions &&
                config.extraConfig.extensions[Metamask.key])
                this.options = config.extraConfig.extensions[Metamask.key] as MetamaskOptions;
        }
    }

    private window: WindowInfo;
    public async navigateToPage() {
        this.window = await oh.browser.window().open();
        await oh.get(this.extensionUrl);
        await MetamaskPage.RemoveCss();
    }
    public exitPage() {
        return oh.browser.window().close(this.window);
    }
    public async acceptTerms() {
        await this.navigateToPage();
        let page = await TermsAndConditions.WaitForPage<TermsAndConditions>(TermsAndConditions);
        await page.skipTou();
        await this.exitPage();
    }
    public async createAccount(password: string = "password1234") {
        await this.navigateToPage();
        let page = await Create.WaitForPage<Create>([Create, TermsAndConditions]);
        if (page instanceof TermsAndConditions) page = await page.skipTou() as Create;
        await page.fill({ password: password } as any, false);
        await this.exitPage();
    }
    public async importAccount(seed: string, password = 'password1234') {
        await this.navigateToPage();
        let locked = await Locked.WaitForPage<Locked>([Locked, TermsAndConditions]);
        if (locked instanceof TermsAndConditions) locked = await locked.skipTou() as Locked;
        await locked.init();
        let page = await locked.import();
        await page.fill({ password: password, seed: seed } as any, false);
        await page.next();
        await this.exitPage();
    }
    public async lock() {
        await this.navigateToPage();
        let page = await MetamaskPage.WaitForPage<MetamaskPage>(MetamaskPage).then(p => p.init({ mode: InitMode.OnlyObjects }));
        await page.settings.lock();
        await this.exitPage();
    }
    public async unlock(password = 'password1234') {
        await this.navigateToPage();
        let page = await Locked.WaitForPage<Locked>(Locked);
        await page.fill({ password: password } as any, false);
        await page.next();
        await this.exitPage();
    }
    public async switchNetwork(network: Network = Network.Main) {
        await this.navigateToPage();
        let page = await MetamaskPage.WaitForPage<MetamaskPage>(MetamaskPage).then(p => p.init({ mode: InitMode.OnlyObjects }));
        await page.network.next(network);
        await this.exitPage();
    }

    // TODO: Add changing an account
    // TODO: Make sure to switch to the original page after interacting with metamask
    // TODO: Refresh the page multiple times if the transaction is not appearing still
    public async confirmTransaction(opts?: { gasLimit?: number, gas?: number }) {
        await this.navigateToPage();
        let page = await Transaction.WaitForPage<Transaction>(Transaction, { refreshOnNotFound: true });
        await Transaction.RemoveCss();
        if (opts) await page.fill(opts as any, false);
        await page.next();
        await this.exitPage();
    }

    public async switchAccount(name?: string) {
        await this.navigateToPage();
        let page = await MetamaskPage.WaitForPage<MetamaskPage>(MetamaskPage).then(p => p.init({ mode: InitMode.OnlyObjects }));
        if (!name) await page.account.create();
        else await page.account.select(name);
        await this.exitPage();
    }

    public async accountInfo(): Promise<{ name: string, ethAmount: number, ethAddress: string }> {
        await this.navigateToPage();
        let page = await Detail.WaitForPage<Detail>(Detail);
        await page.init();
        await this.exitPage();
        return page;
    }
}

ExtensionManager.Register({
    extension: Metamask,
    name: 'Metamask',
    supportedBrowsers: ExtensionBrowser.Chrome | ExtensionBrowser.Brave | ExtensionBrowser.Opera |
        ExtensionBrowser.Firefox | ExtensionBrowser.Safari | ExtensionBrowser.Edge
});