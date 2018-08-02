import { oh, ElementWrapper, WindowInfo, By, RunnerConfig } from "framework/helpers";
import { ExtensionManager, Extension, ExtensionBrowser, ExtensionData, ExtensionConfig } from "./extensionManager";
import { load } from 'cheerio';
import * as request from 'request-promise-native';
import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';
import { sync as rmdir } from 'rimraf';
import * as unzipper from 'unzipper';
import ChromeExtension = require('crx');
import rsa = require('node-rsa');

export interface MetamaskOptions {
    extensionId: string;
    gasLimit: number,
    gas: number;
}

const timeout = seconds =>
    new Promise(resolve => setTimeout(resolve, seconds * 1000));

export enum Network {
    "Main",
    "Ropsten",
    "Rinkeby",
    "Kovan",
    "Localhost",
    "Custom"
}

// TODO: Refactor all of this, making nice pages and such...
export class Metamask extends Extension {
    private static key: string = 'METAMASK_UNIQUE_CONFIG_KEY';
    public getConfig(): ExtensionConfig {
        return { key: Metamask.key, config: this.options };
    }
    public async getExtension(browser: ExtensionBrowser): Promise<ExtensionData> {
        let url = 'https://github.com/MetaMask/metamask-extension/releases/latest';
        let html = await request.get(url, { followAllRedirects: true });
        let search = load(html);
        switch (browser) {
            case ExtensionBrowser.Brave:
                console.log('Metamask is installed by default in Brave');
                return null;
            default:
                let found = search(`a[href*="metamask-${ExtensionBrowser[browser].toLowerCase()}"]`);
                if (!found) return null;
                let downloaded = tmp.fileSync({
                    prefix: `metamask-extension-${ExtensionBrowser[browser]}`,
                    postfix: `.${ExtensionManager.GetFileExtensionForBrowser(browser)}`
                });
                await new Promise<void>((r, e) => request.get(`https://github.com${found.attr('href')}`, { followAllRedirects: true })
                    .on('error', function (err) {
                        console.log(err);
                        downloaded.removeCallback();
                        e(err);
                    })
                    .pipe(fs.createWriteStream(downloaded.name)
                        .on('finish', () => r())
                        .on('error', err => {
                            downloaded.removeCallback();
                            e(err)
                        })));
                let folder = tmp.dirSync({ prefix: `metamask-extension-${ExtensionBrowser[browser]}` });
                await new Promise((r, e) => fs.createReadStream(downloaded.name)
                    .pipe(unzipper.Extract({ path: folder.name }))
                    .on('close', r)
                    .on('error', err => {
                        downloaded.removeCallback();
                        folder.removeCallback();
                        e(err);
                    }));
                if (browser === ExtensionBrowser.Chrome) {
                    // Repack the extension
                    let manifestFile = path.join(folder.name, 'manifest.json');
                    let manifest = JSON.parse(fs.readFileSync(manifestFile).toString());
                    //manifest.key = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlcgI4VVL4JUvo6hlSgeCZp9mGltZrzFvc2Asqzb1dDGO9baoYOe+QRoh27/YyVXugxni480Q/R147INhBOyQZVMhZOD5pFMVutia9MHMaZhgRXzrK3BHtNSkKLL1c5mhutQNwiLqLtFkMSGvka91LoMEC8WTI0wi4tACnJ5FyFZQYzvtqy5sXo3VS3gzfOBluLKi7BxYcaUJjNrhOIxl1xL2qgK5lDrDOLKcbaurDiwqofVtAFOL5sM3uJ6D8nOO9tG+T7hoobRFN+nxk43PHgCv4poicOv+NMZQEk3da1m/xfuzXV88NcE/YRbRLwAS82m3gsJZKc6mLqm4wZHzBwIDAQAB";
                    var key = new rsa({ b: 2048 }),
                        keyVal = key.exportKey('pkcs1-private-pem');
                    let crx = new ChromeExtension({
                        privateKey: keyVal,
                    });
                    crx = await crx.load(folder.name);
                    crx.publicKey = await crx.generatePublicKey();
                    manifest.key = crx.publicKey.toString('base64');
                    this.options.extensionId = await crx.generateAppId();
                    console.log(`Registering extension with uuid ${this.options.extensionId}`)
                    fs.writeFileSync(manifestFile, JSON.stringify(manifest), { encoding: 'utf8' });
                    crx = new ChromeExtension({
                        privateKey: keyVal,
                        publicKey: manifest.key,
                        appId: this.options.extensionId
                    });
                    crx = await crx.load(folder.name);
                    let crxBuffer = await crx.pack();
                    fs.writeFileSync(downloaded.name, crxBuffer);
                }
                return { file: downloaded.name, uncompressed: folder.name, afterExecution: () => { downloaded.removeCallback(); rmdir(folder.name); } };
        }
    }
    private options: MetamaskOptions = {
        extensionId: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
        gas: 20,
        gasLimit: 100000
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
            if (config && config.extensions && config.extensions[Metamask.key])
                this.options = config.extensions[Metamask.key] as MetamaskOptions;
        }
    }

    public waitForSignInScreen() {
        return oh.by(By.xpath('.//*[@id="metamask-mascot-container"]'));
    }

    public waitForConfirmationPrompt() {
        return oh.by(By.xpath('.//*[@class="page-subtitle"]'));
    }

    private window: WindowInfo;
    public async navigateToPage() {
        this.window = await oh.browser.window().open();
        await oh.get(this.extensionUrl);
    }
    public exitPage() {
        return oh.browser.window().close(this.window);
    }
    private termsAccepted = false;
    public async acceptTerms() {
        this.termsAccepted = true;
        await this.navigateToPage();
        let terms: ElementWrapper = await oh.by(By.xpath('.//div[@class="markdown"]'));
        await oh.browser.executeScript(`arguments[0].scroll(0, arguments[0].scrollHeight)`, await terms.getWebElement());
        await oh.wait(async () => !await oh.present(By.xpath('.//button[@disabled]')), 'Timeout waiting for button to be enabled');
        await oh.click(By.xpath('.//button'));
        // Privacy
        await oh.click(By.xpath('.//button'));
        // Phishing alert
        terms = await oh.by(By.xpath('.//div[@class="markdown"]'));
        await oh.browser.executeScript(`arguments[0].scroll(0, arguments[0].scrollHeight)`, await terms.getWebElement());
        await oh.wait(async () => !await oh.present(By.xpath('.//button[@disabled]')), 'Timeout waiting for button to be enabled');
        await oh.click(By.xpath('.//button'));
        await this.exitPage();
    }
    public async createAccount(password: string = "password1234") {
        if (!this.termsAccepted) await this.acceptTerms();
        await this.navigateToPage();
        await oh.type(By.xpath('.//*[@id="password-box"]'), password);
        await oh.type(By.xpath('.//*[@id="password-box-confirm"]'), password);
        await oh.click(By.xpath('.//button'));
        await oh.click(By.xpath('.//button[@class="primary"][text()="I\'ve copied it somewhere safe"]'));
        await oh.by(By.xpath('.//*[contains(@class,"account-detail-section")]'));
        await this.exitPage();
    }
    public async importAccount(seed: string, password = 'password1234') {
        if (!this.termsAccepted) await this.acceptTerms();
        await this.navigateToPage();
        await oh.click(By.xpath('.//p[@class="pointer"]'));
        await oh.type(By.xpath('.//textarea'), seed);
        await oh.type(By.xpath('.//*[@id="password-box"]'), password);
        await oh.type(By.xpath('.//*[@id="password-box-confirm"]'), password);
        await oh.click(By.xpath('.//button[text()="OK"]'));
        await oh.by(By.xpath('.//*[contains(@class,"account-detail-section")]'));
        await this.exitPage();
    }
    public async lock() {
        await this.navigateToPage();
        await oh.click(By.xpath('.//*[@class="sandwich-expando"]'));
        await timeout(0.5);
        await oh.click(By.xpath('.//*[@class="menu-droppo"]//*[@class="dropdown-menu-item"]'));
        await this.waitForSignInScreen();
        await this.exitPage();
    }
    public async unlock(password = 'password1234') {
        await this.navigateToPage();
        await oh.type(By.xpath('.//*[@id="password-box"]'), password);
        await oh.click(By.xpath('.//button'));
        await oh.by(By.xpath('.//*[contains(@class,"account-detail-section")]'));
        await this.exitPage();
    }
    public async switchNetwork(network: Network = Network.Main) {
        await this.navigateToPage();
        await oh.click(By.xpath('.//*[@class="network-indicator"]'));
        await timeout(0.5);
        await oh.click(By.xpath(`.//li[@class="dropdown-menu-item" and contains(text(),"${Network[network]}")]`));
        await oh.by(By.xpath(`.//*[@class="network-name" and contains(text(),"${Network[network]}")]`))
        await this.exitPage();
    }

    // TODO: Add changing an account
    // TODO: Make sure to switch to the original page after interacting with metamask
    // TODO: Refresh the page multiple times if the transaction is not appearing still
    public async confirmTransaction() {
        await this.navigateToPage();
        await oh.refresh();
        await this.waitForConfirmationPrompt();
        let inputs = await oh.all(By.xpath('.//input[@type="number" and @class="hex-input"]'));
        let confirmButton;
        if (!inputs.length) {
            confirmButton = await oh.by(By.xpath('.//button[text()="Sign"]'));
        } else {
            await oh.type(inputs[0], this.options.gasLimit);
            await oh.type(inputs[1], this.options.gas);
            confirmButton = await oh.by(By.xpath('.//input[@type="submit"][@class="confirm"][not(@disabled)]'));
        }
        await confirmButton.click();
        await oh.by(By.xpath('.//*[contains(@class,"account-detail-section")]'));
        await this.exitPage();
    }
}

ExtensionManager.Register({
    extension: Metamask,
    name: 'Metamask',
    supportedBrowsers: ExtensionBrowser.Chrome | ExtensionBrowser.Brave | ExtensionBrowser.Opera |
        ExtensionBrowser.Firefox | ExtensionBrowser.Safari | ExtensionBrowser.Edge
});