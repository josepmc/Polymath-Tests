import clone = require('clone');
import deasync = require('deasync');
import EventEmitter = require('events');
import { assert, By, Locator, RunnerConfig } from '../../helpers';
import { LocatorCompare } from '../shared';
import { ElementWrapper, AndroidElement, MobileElement } from './element';
import { fillImplemented, OldMethods } from './shared';
import { IWindow, WindowInfo } from './window';
import { PuppeteerHandle } from './puppeteer';
import {
    Capabilities,
    ElementArrayFinder,
    ElementFinder,
    promise as ProtractorPromise,
    protractor,
    ProtractorBrowser,
    WebElement,
    ProtractorBy
} from 'protractor';
import ProtractorPerf = require('protractor-perf');
import { ILocation, ISize, promise as WebdriverPromise, IWebDriverOptionsCookie, By as WebdriverBy } from 'selenium-webdriver';
import parseDomain = require('parse-domain');
import { DownloadManager } from 'config/download/abstract';
const cssHighlight = require('../injectors/cssHighlight');
const xPathFinder = require('../injectors/xpath');
const Command = require('selenium-webdriver/lib/command').Command;

export interface Domain {
    domain: string;
    subdomain: string;
    tld: string;
}
export class BrowserEvents extends EventEmitter {
    public emit(event: string | symbol, ...args: any[]): boolean {
        for (let listener of this.listeners(event)) {
            try {
                deasync(async function (args, self, callback) {
                    try {
                        await listener.apply(self, args);
                        callback();
                    } catch (error) {
                        callback(error);
                    }
                })(args, this);
            } catch (error) {
                throw String(`BrowserEmitter: A listener had an error: ${error}`);
            }
        }
        return true;
    }
}

export enum AndroidByMode {
    Id, Description, Text, Class,
}
export interface AndroidByOpts {

    // The mode to use when looking for selectors. Defaults to Id.
    mode: AndroidByMode;
    // Only used when mode = id. Defaults to true.
    ignoreIdPrefix: boolean;
    // Specific locator for the 'scrolling' parent
    // Needs to be on the form of '.resourceId....' as it's passed directly as a suffix to the UiSelector() method
    scrollContainerLocator?: string;
    swipeDeadZone?: number;
    // If true then we are not scrolling looking for the element
    notScroll?: boolean;
}

export class AndroidBy extends WebdriverBy {
    private _nonScrollSelector: WebdriverBy;
    constructor(locator: string, public options: AndroidByOpts, public originalLocator: string) {
        super('-android uiautomator', locator);
    }
    public get nonScrollSelector(): WebdriverBy {
        return this.options ? this._nonScrollSelector ||
            (this._nonScrollSelector = new WebdriverBy('-android uiautomator',
                `new UiSelector().${AndroidBy.buildResource(this.originalLocator, this.options)}`))
            : this.originalLocator;
    }
    private static buildResource(locator: string, options: AndroidByOpts) {
        let resourceLocator;
        switch (options.mode) {
            case AndroidByMode.Id:
                resourceLocator = `resourceIdMatches("${options.ignoreIdPrefix ? '^.*:id/' : ''}${locator}")`;
                break;
            case AndroidByMode.Description:
                resourceLocator = `descriptionMatches("${locator}")`;
                break;
            case AndroidByMode.Text:
                resourceLocator = `textMatches("${locator}")`;
                break;
            case AndroidByMode.Class:
                resourceLocator = `className("${locator}")`;
                break;
        }
        return resourceLocator;
    }
    public static build(locator: string, options: AndroidByOpts) {
        let locatorUsed = locator;
        if (options) {
            // For version olders than 1.7.1
            // tslint:disable-next-line:max-line-length
            // locatorUsed = `new UiScrollable(new UiSelector().scrollable(true)${options.scrollContainerLocator || ''}).scrollIntoView(new UiSelector().${this.buildResource(locator, options)})`;
            if (options.notScroll) {
                locatorUsed = `new UiSelector().${this.buildResource(locator, options)}`;
            } else if (options.swipeDeadZone) {
                // tslint:disable-next-line:max-line-length
                locatorUsed = `new UiScrollable(new UiSelector().scrollable(true)${options.scrollContainerLocator || ''}).setSwipeDeadZonePercentage(${options.swipeDeadZone}).scrollIntoView(new UiSelector().${this.buildResource(locator, options)})`;
            } else {
                // tslint:disable-next-line:max-line-length
                locatorUsed = `new UiScrollable(new UiSelector().scrollable(true)${options.scrollContainerLocator || ''}).scrollIntoView(new UiSelector().${this.buildResource(locator, options)})`;
            }
        }
        return new AndroidBy(locatorUsed, options, locator);
    }
}

// Link for knowing how to create 'Predicates'
// https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/Predicates/Articles/pSyntax.html
export enum IOSByType {
    Accessibility, ClassChain, ClassName, Name, Predicate,
}

export class IOSBy extends WebdriverBy {
    constructor(locator: string, type: IOSByType) {
        let typeConversion = null;
        switch (type) {
            case IOSByType.Accessibility:
                typeConversion = 'accessibility id';
                break;
            case IOSByType.ClassChain:
                typeConversion = '-ios class chain';
                break;
            case IOSByType.ClassName:
                typeConversion = 'class name';
                break;
            case IOSByType.Name:
                typeConversion = 'name';
                break;
            case IOSByType.Predicate:
                typeConversion = '-ios predicate string';
                break;
            // TypeScript 2.4.1 doesn't like it!!
            // default:
            // throw `IOSBy - Type ${IOSByType[type]} is not supported`;
        }
        super(typeConversion, locator);
    }
}
let IOSByStatic: {
    (locator: string, type?: IOSByType): IOSBy;
    classChain(locator: string): IOSBy;
    className(locator: string): IOSBy;
    accessibility(locator: string): IOSBy;
    name(locator: string): IOSBy;
    predicate(locator: string): IOSBy;
};
(IOSByStatic as any) = function (locator, type = IOSByType.Accessibility) { return new IOSBy(locator, type); };
IOSByStatic.classChain = locator => new IOSBy(locator, IOSByType.ClassChain);
IOSByStatic.className = locator => new IOSBy(locator, IOSByType.ClassName);
IOSByStatic.accessibility = locator => new IOSBy(locator, IOSByType.Accessibility);
Object.defineProperty(IOSByStatic, 'name', { value: locator => new IOSBy(locator, IOSByType.Name) });
IOSByStatic.predicate = locator => new IOSBy(locator, IOSByType.Predicate);

export class ByWrapper extends ProtractorBy {
    public android(locator: string, opts: AndroidByOpts = { ignoreIdPrefix: true, mode: AndroidByMode.Id }): Locator {
        return AndroidBy.build(locator, opts);
    }

    public get ios() { return IOSByStatic; }

    public androidChildFrom(parent: string, locator: string, opts: AndroidByOpts = { mode: AndroidByMode.Id, ignoreIdPrefix: true }) {
        let locatorUsed = `new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(
            new UiSelector().resourceIdMatches("^.*:id/${parent}").childSelector(new UiSelector().resourceIdMatches("^.*:id/${locator}")))`;
        return new AndroidBy(locatorUsed, opts, locator);
    }
    public androidChildFromNext(sibling: string, locator: string, opts: AndroidByOpts = null) {
        let locatorUsed = `new UiScrollable(
            new UiSelector().scrollable(true)).scrollIntoView(
            new UiSelector().descriptionMatches("${sibling}").fromParent(
            new UiSelector().descriptionMatches("${locator}")))`;
        return new AndroidBy(locatorUsed, opts, locator);
    }
}

export interface RestartOpts {
    CopyCookies?: boolean;
    DontCopySize?: boolean;
    DontCopyPosition?: boolean;
}

export class BrowserWrapper extends ProtractorBrowser implements OldMethods<ProtractorBrowser> {
    public oldMethods: ProtractorBrowser;
    protected constructor(browser: ProtractorBrowser) {
        super(browser);
        let dlmgr = (deasync(async callback =>
            callback(null, await browser.getProcessedConfig()))() as RunnerConfig).extraConfig;
        if (dlmgr && dlmgr.downloadManager)
            this.downloadManager = DownloadManager.restore(dlmgr.downloadManager);
    }
    public get elementWrapper() {
        return ElementWrapper;
    }

    public async setup(config: RunnerConfig) {
        const registerCss = (self) => {
            return self.executeScript(cssHighlight);
        };
        if (config.params.highlight) {
            this.events.addListener('pageChange', registerCss);
        }
    }

    protected _by: ByWrapper;
    public get By(): ByWrapper {
        return this._by || (this._by = new ByWrapper());
    }

    public downloadManager: DownloadManager;
    public static create(browser: ProtractorBrowser) {
        // Parse own constructor and find out locally implemented functions
        let caps: Capabilities = deasync(async callback =>
            callback(null, await browser.driver.getCapabilities()))(),
            config: RunnerConfig = deasync(async callback =>
                callback(null, await browser.getProcessedConfig()))(),
            // 'os' for BrowserStack, 'platformName' for the Android emulator, 'platform' for Desktop
            created: BrowserWrapper, os: string = caps.get('os') || caps.get('platformName') || caps.get('platform');
        browser.ignoreSynchronization = true; // Ignore Angular by default, objects will enable it on-demand
        switch (os.toLowerCase()) {
            case 'ios':
                created = new IOSWrapper(browser);
                break;
            case 'android':
                created = new AndroidWrapper(browser);
                break;
            default:
                let found: PuppeteerHandle;
                if (caps.get('browserName') === 'chrome' && !config.browserstackUser) {
                    if (PuppeteerHandle.any && (found = deasync(async cb => cb(null, await PuppeteerHandle.find(browser)))())) {
                        created = new PuppeteerWrapper(browser, found);
                    } else created = new ChromeWrapper(browser);
                } else created = new BrowserWrapper(browser);
                break;
        }
        fillImplemented(created, browser);
        Object.setPrototypeOf(browser, Object.getPrototypeOf(created));
        browser.perf = new ProtractorPerf(protractor, browser);
        browser.element = (() => {
            let element: any = ((locator): ElementWrapper => {
                return (browser as BrowserWrapper).elementWrapper.create(new ElementArrayFinder(browser).all(locator).toElementFinder_());
            });
            element.all = (locator): ElementArrayFinder => {
                // We may need to also wrap ElementArrayFinder
                return new ElementArrayFinder(browser).all(locator);
            };
            return element;
        })(); // Manually replace this one
        browser.ignoreSynchronization = true; // Ignore Angular by default, objects will enable it on-demand
        deasync(callback => (browser as BrowserWrapper).setup(config).then(() => callback()))();
        return browser as BrowserWrapper;
    }

    public $ = (query: string): ElementFinder => {
        return this.elementWrapper.create(this.oldMethods.$(query)) as ElementFinder;
    }

    public perf: ProtractorPerf;

    private _oldBaseUrl: string;
    public setBaseUrl(url: string) {
        this._oldBaseUrl = this._oldBaseUrl || this.baseUrl;
        this.baseUrl = url;
    }

    public async all(locator: Function | Locator) {
        return (await this.element.all(locator) as any).map((el, idx) => this.elementWrapper.create(el, null, idx));
    }

    protected _size: ISize;
    public async getSize(force?: boolean): Promise<ISize> {
        return (!force && this._size) || (this._size = await this.driver.manage().window().getSize());
    }

    public async setSize(newSize: ISize): Promise<void> {
        this._size = undefined;
        this.isMaximized = false;
        await this.driver.manage().window().setSize(newSize.width, newSize.height);
    }

    public async setPosition(newSize: ILocation): Promise<void> {
        this._position = undefined;
        this.isMaximized = false;
        await this.driver.manage().window().setPosition(newSize.x, newSize.y);
    }

    public isMaximized: boolean;
    public async maximize(): Promise<void> {
        this._size = undefined;
        this._position = undefined;
        await this.driver.manage().window().maximize();
        this.isMaximized = true;
    }

    protected _position: ILocation;
    public async getPosition(force?: boolean): Promise<ILocation> {
        return (!force && this._position) || (this._position = await this.driver.manage().window().getPosition());
    }

    protected _fileDetector;
    public setFileDetector(fileDetector: any) {
        this._fileDetector = fileDetector;
        this.oldMethods.setFileDetector(fileDetector as any);
    }

    public cache: {
        elements: { [k: string]: ElementWrapper },
        defaultWindow?: WindowInfo,
        currentWindow?: WindowInfo,
    } = { elements: {} };

    public resetCache(keepIframe = false) {
        this.cache.elements = {};
        let currentWindow = this.cache.currentWindow;
        this.cache.currentWindow = new WindowInfo(null);
        if (keepIframe) {
            let self = this;
            deasync(async callback => {
                await self.switchToFrame(new WindowInfo(null, currentWindow.iframeStructure));
                callback();
            })();
        }
    }

    protected _caps: Capabilities;
    public getCapabilities(force?: boolean) {
        let method = this.oldMethods.getCapabilities;
        return (!force && this._caps) || (this._caps = deasync(async callback =>
            callback(null, await method()))());
    }

    protected _processedConfig: RunnerConfig;
    public getProcessedConfig(force?: boolean) {
        let method = this.oldMethods.getProcessedConfig;
        return (!force && this._processedConfig) || (this._processedConfig = deasync(async callback =>
            callback(null, await method()))());
    }

    public events: BrowserEvents = new BrowserEvents();

    public get(destination: string, timeout?: number) {
        this.resetCache();
        return this.oldMethods.get(destination, timeout).then(res => {
            this.events.emit('pageChange', this);
            return res;
        }, error => {
            console.error(`Browser - Get: An error ocurred while getting the page: ${error}`);
            debugger;
            if (error) throw error;
        });
    }

    protected static async setCookies(cookiesList: IWebDriverOptionsCookie[], browser: BrowserWrapper) {
        let cookies: { [k: string]: IWebDriverOptionsCookie[] } = {};
        for (let cookie of cookiesList) {
            let domain = parseDomain(cookie.domain) as Domain;
            let compoundDomain = `http://${domain.subdomain ? domain.subdomain : 'www'}.${domain.domain}.${domain.tld}`;
            (cookies[compoundDomain] || (cookies[compoundDomain] = [])).push(cookie);
        }
        let currentUrl = await browser.getCurrentUrl();
        await browser.manage().deleteAllCookies();
        for (let url in cookies) {
            // Navigate first to the domain and set the cookies like that
            await browser.driver.get(url);
            for (let cookie of cookies[url]) {
                try {
                    // The typescript definitions are wrong, we need to pass an object instead of arguments
                    (await browser.driver.manage() as any).addCookie(cookie);
                } catch (error) {
                    console.error(`Browser - Couldn't set cookie: ${error}`);
                }
            }
        }
        await browser.driver.get(currentUrl);
    }

    public restart(restartOpts: RestartOpts = {}): any {
        // This is affected by: https://github.com/angular/protractor/issues/4151
        // Force set the configuration again, as otherwise it won't be set
        let fn = async () => {
            let ignoreSynchronization = this.ignoreSynchronization;
            let position = await this.getPosition();
            let size = await this.getSize();
            let cookies;
            if (restartOpts.CopyCookies) {
                cookies = await this.manage().getCookies();
            }
            let newBrowser = BrowserWrapper.create(await this.oldMethods.restart());
            newBrowser.events = this.events;
            newBrowser._caps = this._caps;
            newBrowser._processedConfig = this._processedConfig;
            newBrowser._by = this._by;
            newBrowser.baseUrl = this.baseUrl;
            newBrowser.ignoreSynchronization = ignoreSynchronization;
            if (restartOpts.CopyCookies) {
                await BrowserWrapper.setCookies(cookies, newBrowser);
            }
            if (this._fileDetector) newBrowser.setFileDetector(this._fileDetector);
            if (this.isMaximized && !restartOpts.DontCopyPosition && !restartOpts.DontCopySize) await newBrowser.maximize();
            else {
                if (!restartOpts.DontCopyPosition) await newBrowser.setPosition(position);
                if (!restartOpts.DontCopySize) await newBrowser.setSize(size);
            }
            this.events.emit('restart', this, restartOpts);
            return newBrowser;
        };
        return fn();
    }

    public async present(selector: Locator | ElementWrapper, parent?: Locator | ElementWrapper): Promise<boolean> {
        try {
            if (!selector) return false;
            selector = (selector instanceof ElementFinder ? selector : (await this.by(selector, parent, false)));
            return await (selector as ElementFinder).isPresent();
        } catch (err) {
            if (err.name === "NoSuchWindowError") {
                await this.switchToFrame(await this.currentFrame());
                return this.present(selector, parent);
            }
            // This 'catch' is not a safeguard, it often means that the locator is invalid
            let errorSelector = selector;
            let errorParent = parent;
            debugger;
            return false;
        }
    }

    // This method is well implemented
    // If you have problems with the 'actual iframes' not being as expected
    // check that you don't have a dangling promise that is also changing iframes
    private async iframe(selector: Locator | Locator[] = null, parent?: Locator | ElementWrapper, wait: boolean = true): Promise<boolean> {
        let fn = async function () {
            try {
                if (!(selector instanceof Array)) selector = [selector];
                let currentFrame = await this.currentFrame();
                if (WindowInfo.iframeStructureEquals(selector as Locator[], currentFrame.iframeStructure)) return true;
                let newCache = [null];
                for (let idx = 0; idx < (selector as Array<Locator>).length; ++idx) {
                    let sel = selector[idx];
                    //let html = await this.html(await this.by(By.xpath('.//body')));
                    let changed = false;
                    // This could be optimized by finding the shortest path instead of navigating through the entire tree
                    if (sel) {
                        this.cache.elements = {};
                        if (!await this.present(sel, idx ? null : parent)) return false;
                        let frame: ElementFinder = await this.by(sel, idx ? null : parent, wait);
                        await this.switchTo().frame(await frame.getWebElement());
                        changed = true;
                    } else {
                        if (idx > 0) debugger; // We shouldn't have a reference to the defaultContent in the middle of an iframe list
                        if (currentFrame.iframeStructure.length !== 1) { // only change if we're not already having the base branch
                            this.cache.elements = {};
                            await this.switchTo().defaultContent();
                            changed = true;
                        }
                    }
                    // We should optimize this, and indicate that 'from now on' all the elements searched will be under a 'subcache' for this iframe
                    if (changed) {
                        this.cache.elements = {};
                        if (wait) {
                            // Reset the current frame
                            await this.waitFor(async () => {
                                newCache = (await this.currentFrame(true)).iframeStructure;
                                return LocatorCompare(newCache[newCache.length - 1], sel);
                            }, `Iframe - Error! Waiting for the iframe to be changed`);
                        } else if (idx) {
                            // We don't look, we just set the cache
                            newCache.push(sel);
                        }
                    }
                }
                let res = WindowInfo.iframeStructureEquals(selector as Locator[], newCache);
                if (res)
                    this.cache.currentWindow.iframeStructure = newCache;
                return res;
            } catch (error) {
                debugger;
                return false;
            }
        };
        if (wait) return await this.waitFor(() => fn.call(this), `IFrame: Error waiting for iframe to change`);
        return await fn.call(this);
    }

    public async currentFrame(force?: boolean): Promise<WindowInfo> {
        if (!this.cache.currentWindow || force) this.cache.currentWindow = new WindowInfo();
        this.cache.currentWindow.windowHandle = this.cache.currentWindow.windowHandle || await this.getWindowHandle();
        this.cache.currentWindow.iframeStructure = this.cache.currentWindow.iframeStructure || await this.executeScript(
            `
                function fn() {
                    var res = [null], tempSelf = self;
                    while(tempSelf !== tempSelf.top) {
                        res.push(tempSelf.id ? './/*[@id="' + tempSelf.id + '"]' : tempSelf.name ? './/*[@name="' + tempSelf.name + '"]' : null);
                        tempSelf = tempSelf.top;
                    }
                    return res;
                };
                return fn();
                `,
        ).then((res: string[]) => res.map(el => el ? By.xpath(el) : null));
        return clone(this.cache.currentWindow);
    }

    public async defaultFrame(force?: boolean): Promise<WindowInfo> {
        if (!this.cache.defaultWindow || force) this.cache.defaultWindow = new WindowInfo();
        this.cache.defaultWindow.windowHandle = this.cache.defaultWindow.windowHandle || await this.getAllWindowHandles().then(handles => handles[0]);
        this.cache.defaultWindow.iframeStructure = this.cache.defaultWindow.iframeStructure || [null];
        return clone(this.cache.defaultWindow);
    }

    public window(): IWindow {
        // Keep the "this" context
        return {
            open: () => { return this.newWindow(); },
            close: val => { return this.closeWindow(val); },
            waitForNewWindow: (openFn, timeout) => { return this.waitForNewWindow(openFn, timeout); },
            waitForClose: (closeFn, oldHandle, timeout) => { return this.waitForClose(closeFn, oldHandle, timeout); },
        };
    }

    public async switchToFrame(frame: WindowInfo, waitForPresence: boolean = false): Promise<WindowInfo> {
        // We're not resetting the cache here, this may give us problems
        let defaultFrame = await this.defaultFrame();
        if (!frame) frame = defaultFrame;
        if (!frame.windowHandle) frame.windowHandle = defaultFrame.windowHandle;
        let oldFrame = await this.currentFrame();
        if (frame.windowHandle !== oldFrame.windowHandle) {
            if (waitForPresence) {
                await this.waitFor(async () => {
                    await this.switchTo().window(frame.windowHandle);
                    return (await this.currentFrame(true)).windowHandle === frame.windowHandle;
                }, `SwitchToFrame - Error: Timeout waiting for the window to change`);
            } else await this.switchTo().window(frame.windowHandle);
            this.cache.currentWindow.iframeStructure = [null]; // By default
            this.cache.currentWindow.windowHandle = frame.windowHandle;
            this.cache.elements = {};
        } else if (WindowInfo.iframeStructureEquals(oldFrame.iframeStructure, frame.iframeStructure)) return oldFrame;
        if (!await this.iframe(frame.iframeStructure, null, waitForPresence)) {
            if (!waitForPresence) {
                // There's no path to the element
                await this.switchTo().window(oldFrame.windowHandle);
                this.cache.currentWindow.windowHandle = oldFrame.windowHandle;
                if (!await this.iframe(oldFrame.iframeStructure, null)) {
                    debugger;
                    // An error ocurred, we can't go back to the previous iframe
                }
                return null;
            }
            debugger;
            // Error ocurred! We don't know where we are - but the next call to get the current window will search for it
            this.cache.currentWindow.iframeStructure = undefined;
            return null;
        }
        // We need to switch the window before executing this
        // Window/frame changes are blocking on their own
        // We can comment this code for optimization purposes
        // let currentFrame = await this.currentFrame();
        // if (!WindowInfo.equals(currentFrame, frame)) {
        //     debugger; // should never occur
        //     let changed = await this.iframe(frame.iFrameStructure, null, waitForPresence);
        // }
        //await this.wait(async () => WindowInfo.equals(await this.currentFrame(), frame), `Timeout: Waiting for the window to be changed`);
        return oldFrame;
    }

    private async newWindow(): Promise<WindowInfo> {
        return this.waitForNewWindow(async () => this.executeScript('window.open()'));
    }

    private async closeWindow(oldHandle: WindowInfo = null, timeout?: number): Promise<void> {
        return this.waitForClose(async () => this.driver.close(), oldHandle, timeout);
    }

    private async waitForNewWindow<T>(openFn: () => Promise<T>, timeout: number = undefined): Promise<WindowInfo> {
        let ah = await this.getAllWindowHandles();
        let currentHandle = await this.currentFrame();
        if (!openFn) debugger; // We shouldn't get here
        await openFn();
        ah = await this.waitFor(() => this.getAllWindowHandles()
            .then(handles => handles.length > ah.length ? handles : null), `Timeout: Waiting for a new window to be opened`, timeout, timeout !== undefined);
        if (!ah) return null;
        await this.switchTo().window(ah[ah.length - 1]);
        await this.waitFor(() => this.getWindowHandle()
            .then(handle => handle === ah[ah.length - 1]), `Timeout: Waiting for the window to be changed`);
        this.cache.currentWindow = new WindowInfo(ah[ah.length - 1], [null]);
        return currentHandle;
    }

    private async waitForClose<T>(closeFn: () => Promise<T>, oldHandle: WindowInfo = null, timeout: number = undefined): Promise<void> {
        let ah = await this.getAllWindowHandles();
        let handleToChange = oldHandle || await this.defaultFrame();
        if (!closeFn) debugger; // We shouldn't get here
        await closeFn();
        await this.driver.switchTo().window(handleToChange.windowHandle);
        ah = await this.waitFor(() => this.getAllWindowHandles()
            .then(handles => handles.length < ah.length ? handles : null), `Timeout: Waiting for a new window to be closed`, timeout, timeout !== undefined);
        if (!ah) return null;
        await this.switchToFrame(handleToChange);
    }

    public sleep(seconds: number) {
        return this.oldMethods.sleep(seconds * 1000);
    }

    public async waitFor<T>(untilCondition: () => T | Promise<T> | ProtractorPromise.Promise<T> | WebdriverPromise.Promise<T> | Function,
        text: string, timeout: number = this.allScriptsTimeout, throwAfterTimeout: boolean = true): Promise<T> {
        if (timeout === undefined) timeout = this.allScriptsTimeout;
        assert(timeout >= 0, `Wait<T>: Error! Timeout (${timeout}) must be bigger or equal than 0.`);
        // In order to force a return, seems browser.wait with timeout=0 never finishes
        if (!timeout) {
            try {
                return await untilCondition() as T;
            } catch (error) {
                debugger;
            }
        }
        let ignoreSynchronization = this.ignoreSynchronization;
        let fn = async function () {
            this.ignoreSynchronization = ignoreSynchronization;
            let res = await untilCondition();
            return res;
        }, _ = this;
        let result = await this.wait(async () => {
            return await fn.call(_);
        }, timeout, text).catch(async error => {
            if (error.name = "NoSuchWindowError") {
                await this.switchToFrame(await this.currentFrame());
                return await fn.call(_);
            }
            if (throwAfterTimeout) {
                let pre_error = error;
                debugger;
                assert(!error, `Wait - ObjectHelper: Timeout: ${error}`);
                // For debug, helps identifying the error
                if (pre_error) return await fn.call(_);
            }
        });
        this.ignoreSynchronization = ignoreSynchronization;
        return result as T;
    }

    public async by(locator: Locator | ElementWrapper,
        parent?: Locator | WebElement | ElementWrapper, wait: boolean = true): Promise<ElementWrapper> {
        let elem: ElementWrapper;
        if (parent instanceof WebElement)
            parent = this.elementWrapper.fromWebElement_(this, parent as WebElement, await this.executeScript(xPathFinder, parent));
        if (!(locator instanceof ElementFinder)) {
            elem = parent ? await (parent as ElementWrapper).element(locator) : this.elementWrapper.create(this.element(locator));
        } else elem = locator as ElementWrapper;
        if (this.cache.elements[elem.hash()]) return this.cache.elements[elem.hash()];
        else this.cache.elements[elem.hash()] = elem;
        let self = this;
        if (wait && !await this.isElementPresent(elem)) await this.waitFor(async () => {
            let res = await this.isElementPresent(elem);
            return res;
        }, `Timeout: Waiting for the element to load: ${elem.locator()}`);
        return elem;
    }
    public async scrollTo(selector: Locator | ElementWrapper, parent?: Locator | ElementWrapper): Promise<boolean> {
        let element = await this.by(selector, parent) as ElementWrapper;
        await this.executeScript("arguments[0].scrollIntoView( { behavior: 'smooth', block: 'center', inline: 'center' });", await element.getWebElement());
        return true;
    }
    public visible(locator: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): () => Promise<boolean> {
        return async () => {
            try {
                let el: ElementWrapper = await this.by(locator, parent, false);
                return el && await el.isDisplayed();
            } catch (err) { return false; } // Because we're not checking whether it's present in this.by
        };
    }
    public async back(): Promise<void> {
        let html = () => this.executeScript('return arguments[0].outerHTML;', this.element(By.css('body')));
        let text = await html();
        this.resetCache();
        await this.driver.executeScript('return history.back();');
        await this.waitFor(async () => {
            let newText = await html().catch(rej => null);
            return newText && newText !== text;
        }, 'Timeout waiting for the page to change');
        this.events.emit('pageChange');
    }
}
// IMPORTANT! This ensures that we're not initializing the object and that we replace the methods we implement
Object.setPrototypeOf(BrowserWrapper, Object);

export class ChromeWrapper extends BrowserWrapper {
    protected _debuggerPort: number = undefined;
    public get debuggerPort(): number {
        if (this._debuggerPort !== undefined) return this._debuggerPort;
        let res = /--remote-debugging-port=(\d+)/.exec(this.runtimeFlags);
        return res ? this._debuggerPort = parseInt(res[1]) : this._debuggerPort = null;
    }
    private _headless: boolean = undefined;
    public get headless(): boolean {
        return this._headless === undefined ? (this._headless = /--headless/.test(this.runtimeFlags)) : this._headless;
    }
    public async fetchRuntimeArgs(browser: ProtractorBrowser = this): Promise<string> {
        try {
            let baseUrl = await browser.getCurrentUrl();
            await browser.get('chrome://version');
            let element = await browser.driver.findElement(WebdriverBy.id('command_line'));
            let runtimeFlags = await element.getText();
            await browser.get(baseUrl);
            return runtimeFlags;
        } catch (e) {
            console.error(`Chrome - FetchRuntimeArgs: Couldn't read the runtime arguments. ${e}`);
            if (`${e}`.indexOf('headless chrome') !== -1) this._headless = true;
            return null;
        }
    }
    public _runtimeFlags: string;
    public get runtimeFlags(): string {
        return this._runtimeArgs;
    }
    public set runtimeFlags(val: string) { this._runtimeFlags = val; }
    public constructor(browser: ProtractorBrowser) {
        super(browser);
        this.runtimeFlags = deasync(async cb => { cb(null, await this.fetchRuntimeArgs(browser)); })();
    }
    public async setup(config: RunnerConfig): Promise<void> {
        await super.setup(config);
        if (this.headless && config.extraConfig && config.extraConfig.extensions) {
            console.warn(`WARNING! Extensions won't be loaded in chrome headless. See https://github.com/GoogleChrome/puppeteer/issues/659 for more information.`)
        }
    }
    public async setDownloadBehaviour() {
        if (this.downloadManager) {
            /*let cmd = new Command('SEND_COMMAND');
            cmd.setParameters({
                'cmd': 'Page.setDownloadBehavior', 'params':
                {
                    'behavior': 'allow',
                    // If this path is not relative (e.g. starts with ./), chrome will FREEZE
                    'downloadPath': this.downloadManager.downloadPath()
                }
            });
            (this.driver as any).executor_.defineCommand(
                'SEND_COMMAND',
                'POST',
                '/session/:sessionId/chromium/send_command');
            await this.driver.schedule(cmd, 'Set the download strategy for Chrome headless');*/
        }
    }
    protected static readonly MAX_WIDTH = 1080;
    protected static readonly MAX_HEIGHT = 1920;
    // Can't maximize in Headless
    public async maximize(): Promise<void> {
        if (!this.headless) return super.maximize();
        else return this.setSize({ width: ChromeWrapper.MAX_WIDTH, height: ChromeWrapper.MAX_HEIGHT });
    }
}

export class PuppeteerWrapper extends ChromeWrapper {
    public constructor(browser: ProtractorBrowser, public handle: PuppeteerHandle) { super(browser); }
    public get debuggerPort(): number {
        return this.handle.debuggerPort;
    }
    public get runtimeFlags(): string {
        return this.handle.runtimeArgs;
    }
    public get headless(): boolean {
        return this.handle.options.headless || super.headless;
    }
    public set runtimeFlags(val: string) { }
    public async fetchRuntimeArgs(): Promise<string> {
        return this.handle ? this.handle.runtimeArgs : null;
    }
    public async setSize(size: ISize) {
        for (let page of await this.handle.browser.pages()) {
            await page.setViewport({ width: size.width, height: size.height });
        }
        this._size = this.handle.size = size;
    }
    public async getSize() {
        return this._size || this.handle.size;
    }
    public async setPosition(position: ILocation) {
        this._position = position;
    }
    public async getPosition() {
        return this._position || { x: 0, y: 0 };
    }
    public async maximize(): Promise<void> {
        return this.setSize({ width: ChromeWrapper.MAX_WIDTH, height: ChromeWrapper.MAX_HEIGHT });
    }
    public quit(): any {
        return this.handle.quit();
    }
    public restart(restartOpts: RestartOpts = {}): any {
        // This is affected by: https://github.com/angular/protractor/issues/4151
        // Force set the configuration again, as otherwise it won't be set
        let fn = async () => {
            let ignoreSynchronization = this.ignoreSynchronization;
            let position = await this.getPosition();
            let size = await this.getSize();
            let cookies;
            if (restartOpts.CopyCookies) cookies = await this.manage().getCookies();
            await this.handle.restart();
            if (restartOpts.CopyCookies) {
                await BrowserWrapper.setCookies(cookies, this);
            }
            this.runtimeFlags = this.handle.runtimeArgs;
            if (this.isMaximized && !restartOpts.DontCopyPosition && !restartOpts.DontCopySize) await this.maximize();
            else {
                if (!restartOpts.DontCopyPosition) await this.setPosition(position);
                if (!restartOpts.DontCopySize) await this.setSize(size);
            }
            await this.switchTo().window((await this.getAllWindowHandles())[0]);
            this.resetCache();
            this.events.emit('restart', this, restartOpts);
            return this;
        };
        return fn();
    }
    public async setup(config: RunnerConfig) {
        await super.setup(config);
    }
}

export abstract class MobileWrapper extends BrowserWrapper {
    public get elementWrapper() {
        return MobileElement;
    }

    // Not implemented
    public async back(): Promise<void> { }

    // Ignore Web-based Setup
    public async setup(config: RunnerConfig) { }

    // Can't resize
    public async setSize(newSize: ISize): Promise<void> { }

    // Can't set position
    public async setPosition(newSize: ILocation): Promise<void> { }

    // Can't maximize in iOS
    public async maximize(): Promise<void> { }

    public async getPosition(force?: boolean): Promise<ILocation> {
        return <ILocation>{ x: 0, y: 0 };
    }

    public async currentFrame(force?: boolean): Promise<WindowInfo> {
        return new WindowInfo(null, [null]);
    }

    public async defaultFrame(force?: boolean): Promise<WindowInfo> {
        return new WindowInfo(null, [null]);
    }

    public async switchToFrame(frame: WindowInfo, waitForPresence: boolean = false): Promise<WindowInfo> {
        return new WindowInfo(null, [null]);
    }

    public window(): IWindow {
        // Keep the "this" context
        return {
            open: () => { console.log('Window - Wrapper - Method not implemented!'); return null; },
            close: val => { console.log('Window - Wrapper - Method not implemented!'); return null; },
            waitForNewWindow: (openFn, timeout) => { console.log('Window - Wrapper - Method not implemented!'); return null; },
            waitForClose: (closeFn, oldHandle, timeout) => { console.log('Window - Wrapper - Method not implemented!'); return null; },
        };
    }
}

export class IOSWrapper extends MobileWrapper {
    public async scrollTo(element: Locator | MobileElement, parent?: Locator | MobileElement): Promise<boolean> {
        let el = await this.by(element, parent) as MobileElement;
        let id = await el.getId();
        await this.executeScript('mobile: scroll', { element: id, toVisible: 'true' });
        return true;
    }
}

export class AndroidWrapper extends MobileWrapper {
    public get elementWrapper() {
        return AndroidElement;
    }
    constructor(browser) {
        super(browser);
    }
    public executeScript<T>(script: string | Function, ...var_args: any[]): any {
        console.warn('executeScript - AndroidWrapper - Method not implemented!');
    }
    public executeAsyncScript<T>(script: string | Function, ...var_args: any[]): any {
        console.warn('executeScript - AndroidWrapper - Method not implemented!');

    }
    public executeScriptWithDescription(script: string | Function, description: string, ...scriptArgs: any[]): any {
        console.warn('executeScript - AndroidWrapper - Method not implemented!');

    }
    public async scrollTo(selector: Locator | AndroidElement, parent?: Locator | AndroidElement): Promise<boolean> {
        let element: AndroidElement = await this.by(selector, parent, false);
        let locator: AndroidBy = element.locator();
        if (locator instanceof AndroidBy) {
            return await element.isPresent(true);
        } else {
            // if this is not an androidby....
            let attr = await element.getId();
            let opts: AndroidByOpts = { ignoreIdPrefix: true, mode: AndroidByMode.Id };
            if (!attr) {
                attr = await element.getDescription();
                if (attr) opts.mode = AndroidByMode.Description;
                else {
                    attr = await element.getText();
                    if (!attr) throw `scrollTo - AndroidWrapper: Unable to find any attribute from the element to scroll to.`;
                    opts.mode = AndroidByMode.Text;
                }
            }
            let el: AndroidWrapper = await this.by(By.android(attr, opts), null, false);
            return await el.isPresent(true);
        }
    }
    public visible(locator: Locator | MobileElement,
        parent?: Locator | MobileElement): () => Promise<boolean> {
        if (locator instanceof ElementFinder && locator.locator() instanceof AndroidBy) locator = locator.locator();
        if (parent instanceof ElementFinder && parent.locator() instanceof AndroidBy) parent = parent.locator();
        if (locator instanceof AndroidBy) locator = (locator as AndroidBy).nonScrollSelector;
        if (parent instanceof AndroidBy) parent = (parent as AndroidBy).nonScrollSelector;
        // Visible is not working in android
        return super.visible(locator, parent);
    }
}
