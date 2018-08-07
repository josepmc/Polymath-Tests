import * as pup from 'puppeteer-extra';
import { Browser, LaunchOptions } from 'puppeteer';
const puppeteer: {
    Browser: Browser;
    executablePath(): string;
    launch(options?: LaunchOptions): Promise<Browser>;
    use(Function);
    plugins: Array<Object>;
    pluginNames: Array<string>;
} = pup;
import deasync = require('deasync');
import { randomBytes } from 'crypto';
import { ISize } from 'selenium-webdriver';
import * as tmp from 'tmp';
import * as rimraf from 'rimraf';
import { ProtractorBrowser } from 'protractor';
import { DownloadManager } from 'config/download/abstract';

export interface PuppeteerOptions {
    headless?: boolean;
    launchArgs?: string[];
    userDataDir?: string;
    extensions?: string[];
    downloadManager?: DownloadManager;
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
    public browser: Browser;
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
    private static createInstance(options: PuppeteerOptions): Browser {
        let opts = {
            headless: options.headless,
            ignoreHTTPSErrors: true,
            userDataDir: options.userDataDir,
            args: (puppeteer as any).defaultArgs().filter(arg => arg !== '--disable-extensions')
                .concat(options.launchArgs),
            ignoreDefaultArgs: true
        };
        return deasync(callback => {
            let tries = 0;
            let fn = () => puppeteer.launch(opts).then(res => callback(null, res)).catch(err => {
                if (tries < 10) return fn();
                else callback(err);
            });
            fn();
        })();
    }
    private tmpDirHandle: tmp.SynchrounousResult;
    public constructor(public options: PuppeteerOptions = { headless: false }) {
        if (!this.options.launchArgs)
            this.options.launchArgs = [
                '--no-sandbox',
                '--no-proxy-server',
                '--ignore-certificate-errors',
                '--enable-logging',
                '--force-fieldtrials=SiteIsolationExtensions/Control',
                '--log-level=0',
                '--test-type=webdriver',
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
        if (this.options.extensions) {
            for (let extension of this.options.extensions)
                this.options.launchArgs.push(`--load-extension=${extension}`);
        }
        if (this.options.downloadManager) {
            puppeteer.use(require('puppeteer-extra-plugin-user-preferences')({
                userPrefs: {
                    'download': {
                        'prompt_for_download': false,
                        'default_directory': this.options.downloadManager.downloadPath(),
                        'directory_upgrade': true
                    }
                }
            }))
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
        if (idx > 0) this.options.launchArgs.splice(idx, 1);
        this.options.launchArgs = this.options.launchArgs.concat(`--remote-debugging-port=${this.debuggerPort}`)
        this.browser = PuppeteerHandle.createInstance(this.options);
        console.log(`Chrome Headless - Restarted, available on ${this.address}`);
    }
}