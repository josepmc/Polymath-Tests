import * as puppeteer from 'puppeteer';
import * as dapp from 'dappeteer';
import deasync = require('deasync');
import { randomBytes } from 'crypto';
import { ISize } from 'selenium-webdriver';
import * as tmp from 'tmp';
import * as rimraf from 'rimraf';
import { ProtractorBrowser } from '@immoweb/protractor/built';
const dappeteer: Dappeteer = dapp;

interface DappeteerOptions extends puppeteer.LaunchOptions {
    metamaskPath?: string;
    extensionUrl?: string;
}

export enum Network {
    "main",
    "ropsten",
    "rinkeby",
    "kovan",
    "localhost"
}

interface TransactionOptions {
    gas?: number;
    gasLimit?: number;
}

export interface Metamask {
    createAccount: (password?: string) => Promise<void>;
    importAccount: (seed?: string, password?: string) => Promise<void>;
    lock: () => Promise<void>;
    unlock: (password?: string) => Promise<void>;
    switchNetwork: (networkName?: Network) => Promise<void>;
    confirmTransaction: (transactionOpts?: TransactionOptions) => Promise<void>;
}

interface Dappeteer {
    launch: (puppeteer, launchOptions: DappeteerOptions) => Promise<puppeteer.Browser>;
    getMetamask: (browser: puppeteer.Browser) => Promise<Metamask>;
}

export interface PuppeteerOptions {
    headless?: boolean;
    launchArgs?: string[];
    userDataDir?: string;
    useDapp?: boolean;
}

// Eventually we need to move towards a multiple extensions model
export class PuppeteerHandle {
    private static registeredInstances: PuppeteerHandle[] = [];
    public static bundledPath: string = puppeteer.executablePath();
    private static tearDownRegistered: boolean = false;
    private static DEFAULT_WINDOW_SIZE: ISize = { width: 768, height: 1024 };
    private _size: ISize;
    public get size(): ISize {
        return this._size || PuppeteerHandle.DEFAULT_WINDOW_SIZE;
    }
    public set size(val: ISize) {
        this._size = val;
    }
    public get runtimeArgs(): string {
        return ((puppeteer as any).defaultArgs() as Array<string>).concat(this.options.launchArgs).join(' ');
    }
    public get address(): string {
        return /^ws:\/\/([^\/]+)\//.exec((this.browser as any)._connection._url)[1];
    }
    public get debuggerPort(): number {
        return parseInt(/:(\d+)/.exec(this.address)[1]);
    }
    public browser: puppeteer.Browser;
    private static tearDown() {
        for (let pup of this.registeredInstances) { deasync(callback => pup.quit().then(callback))(); }
    }
    public static get any(): boolean {
        return PuppeteerHandle.registeredInstances.length > 0;
    }
    public static async find(browser: ProtractorBrowser): Promise<PuppeteerHandle> {
        let content = randomBytes(20).toString('hex');
        let name = 'puppeterFindMe';
        await browser.executeScript(`window['${name}']='${content}';`);
        let found: PuppeteerHandle;
        for (let instance of PuppeteerHandle.registeredInstances) {
            for (let p of await instance.browser.pages()) {
                let res = await p.mainFrame().evaluate(name => {
                    let temp = window[name];
                    window[name] = undefined;
                    return temp;
                }, name);
                if (res === content) {
                    if (found) console.error(`Puppeteer Find: More than one instance contains ${content}`);
                    found = instance;
                }
            }
        }
        return found;
    }
    private static createInstance(options: PuppeteerOptions): puppeteer.Browser {
        let launch = options.useDapp ? (opts) => dappeteer.launch(puppeteer, opts) : puppeteer.launch;
        let opts = {
            headless: options.headless,
            ignoreHTTPSErrors: true,
            userDataDir: options.userDataDir,
            args: [].concat(options.launchArgs),
        };
        return deasync(callback => {
            let tries = 0;
            let fn = () => launch(opts).then(res => callback(null, res)).catch(err => {
                if (tries < 10) return fn();
                else callback(err);
            });
            fn();
        })();
    }
    private tmpDirHandle: tmp.SynchrounousResult;
    public constructor(private options: PuppeteerOptions = { headless: false }) {
        if (!this.options.launchArgs)
            this.options.launchArgs = [
                '--no-sandbox',
                '--no-proxy-server',
                '--ignore-certificate-errors',
                '--disable-background-networking',
                '--disable-client-side-phishing-detection',
                '--disable-default-apps',
                '--disable-hang-monitor',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-sync',
                '--disable-web-resources',
                '--enable-automation',
                '--enable-logging',
                '--force-fieldtrials=SiteIsolationExtensions/Control',
                '--log-level=0',
                '--metrics-recording-only',
                '--no-first-run',
                '--password-store=basic',
                '--test-type=webdriver',
                '--use-mock-keychain',
            ];
        if (!this.options.userDataDir) {
            this.tmpDirHandle = tmp.dirSync({ prefix: 'puppeteer' });
            this.options.userDataDir = this.tmpDirHandle.name;
        }
        // if lighthouse && !headless ==> '--show-paint-rects'
        if (!PuppeteerHandle.tearDownRegistered) {
            process.on('beforeExit', PuppeteerHandle.tearDown);
            PuppeteerHandle.tearDownRegistered = true;
        }
        PuppeteerHandle.registeredInstances.push(this);
        let ws = this.options.launchArgs.find(arg => arg.startsWith('--window-size'));
        if (!ws)
            this.options.launchArgs.concat(`--window-size=${PuppeteerHandle.DEFAULT_WINDOW_SIZE.width},${PuppeteerHandle.DEFAULT_WINDOW_SIZE.height}`);
        else {
            let res = /--window-size=(\d+),(\d+)/.exec(ws);
            if (res) this._size = { width: parseInt(res[1]), height: parseInt(res[2]) };
        }
        this.browser = PuppeteerHandle.createInstance(this.options);
        console.log(`Puppeteer: Started! You can connect using devtools on the following address: ${this.address}`);
    }
    private didQuit: boolean = false;
    public async quit() {
        if (!this.didQuit) {
            this.didQuit = true;
            await this.browser.close();
            if (this.tmpDirHandle) {
                rimraf.sync(this.tmpDirHandle.name);
            }
            PuppeteerHandle.registeredInstances.splice(PuppeteerHandle.registeredInstances.findIndex(el => el === this), 1);
        }
    }
    public async restart(newUserDir: boolean = true) {
        await this.browser.close();
        if (newUserDir) {
            if (this.tmpDirHandle) {
                rimraf.sync(this.tmpDirHandle.name);
            }
            this.tmpDirHandle = tmp.dirSync({ prefix: 'puppeteer' });
            this.options.userDataDir = this.tmpDirHandle.name;
        }
        let idx = this.options.launchArgs.findIndex(el => el.startsWith('--remote-debugging-port'));
        if (idx >= 0) this.options.launchArgs.splice(idx, 1);
        this.options.launchArgs = this.options.launchArgs.concat(`--remote-debugging-port=${this.debuggerPort}`)
        this.browser = PuppeteerHandle.createInstance(this.options);
        console.log(`Chrome Headless - Restarted, available on ${this.address}`);
    }
    private async getMetmask(): Promise<Metamask> {
        let metamask = await dappeteer.getMetamask(this.browser);
        let oldMethod = metamask.switchNetwork;
        metamask.switchNetwork = input => Number.isNaN(input) ? oldMethod(input) : oldMethod(Network[input] as any);
        return metamask;
    }
    public get metamask(): Promise<Metamask> {
        return this.options.useDapp ? this.getMetmask() : new Promise(r => r(null));
    }
}