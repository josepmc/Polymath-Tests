import { assert, By, Locator, NumberRange, ElementWrapper, TestConfig } from './helpers';
import * as moment from 'moment/moment';
import {
    ElementFinder,
    ExpectedConditions as EC,
    promise as ProtractorPromise,
    ProtractorBrowser,
    WebElement,
    protractor,
} from 'protractor';
import { StoreObject, SortedObject } from './object/interfaces';
import { BrowserWrapper } from './object/wrapper';
import { DataGenerator, GeneratorBackend, GetGenerator } from './object/generator';
import { ByWrapper, RestartOpts } from './object/wrapper/browser';

export interface HighlightOpts {
    delay?: number;
}

export class ObjectHelper {
    private _browser: BrowserWrapper;
    public set browser(val: BrowserWrapper) {
        this._browser = val;
    }
    public get browser(): BrowserWrapper {
        if (!this.hasInit) this.init();
        return this._browser;
    }
    public chance: DataGenerator;
    public alert: Alert;
    public triggeredBrowsers: BrowserWrapper[];
    private hasInit = false;
    private init(browsers: ProtractorBrowser[] = this.initFn()) {
        if (!browsers) return;
        this.hasInit = true;
        this.triggeredBrowsers = browsers.map(BrowserWrapper.create);
        this.browser = this.triggeredBrowsers.find(browser => !browser.helper);
        this.chance = new (GetGenerator(GeneratorBackend.Chance))(this.browser.params && this.browser.params.generatorSeed);
        this.alert = new Alert(this);
        TestConfig.instance; // Register the instance
    }
    constructor(private initFn: () => ProtractorBrowser[]) {
        this.init(initFn());
    }

    public get By(): ByWrapper {
        return this.browser && this.browser.By;
    }

    public setBrowser(browser: BrowserWrapper) {
        return this.browser = browser.setBrowser() as BrowserWrapper;
    }

    public setSynchronization(ignoreAngularWaits: boolean = true) {
        this.browser.ignoreSynchronization = ignoreAngularWaits;
    }

    public get url() {
        return this.browser.getCurrentUrl();
    }

    public async refresh(): Promise<void> {
        return await this.browser.refresh();
    }

    public async restart(opts: RestartOpts = {}): Promise<ProtractorBrowser> {
        return this.browser = await this.browser.restart(opts);
    }

    public css(selector: string, parent?: Locator | WebElement | ElementWrapper): Promise<ElementWrapper> {
        return this.by(By.css(selector), parent);
    }

    public xpath(selector: string, parent?: Locator | WebElement | ElementWrapper): Promise<ElementWrapper> {
        return this.by(By.xpath(selector), parent);
    }

    public id(selector: string, parent?: Locator | WebElement | ElementWrapper): Promise<ElementWrapper> {
        return this.by(By.id(selector), parent);
    }

    public async by(selector: Locator | WebElement | ElementWrapper,
        parent?: Locator | WebElement | ElementWrapper, wait: boolean = true): Promise<ElementWrapper> {
        return this.browser.by(selector, parent, wait);
    }

    public async all(selector: Locator | ElementWrapper, parent?: Locator | WebElement | ElementWrapper): Promise<ElementWrapper[]> {
        let elementParent: ElementWrapper = parent ? await this.by(parent) : selector instanceof ElementFinder ? (selector as ElementWrapper).parent : null;
        let result: ElementWrapper[];
        if (selector instanceof ElementFinder) {
            result = await selector.all(By.xpath('self::*')) as ElementWrapper[];
        } else if (elementParent) {
            result = await elementParent.all(selector) as ElementWrapper[];
        } else {
            return await this.browser.all(selector);
        }
        return await result.map<ElementWrapper>((el, idx) => this.browser.elementWrapper.create(el as ElementFinder, elementParent as ElementWrapper, idx) as ElementWrapper);
    }

    public async inViewport(selector: Locator | ElementWrapper, parent?: Locator | ElementWrapper): Promise<boolean> {
        return await (await this.by(selector, parent)).inViewport();
    }

    public async scrollTo(selector: Locator | ElementWrapper, parent?: Locator | ElementWrapper, bruteForce: boolean = false): Promise<boolean> {
        return await this.browser.scrollTo(selector, parent, bruteForce);
    }

    public async click(selector: Locator | WebElement | ElementWrapper,
        parent?: Locator | WebElement | ElementWrapper, resetCache: boolean = true, keepIframe: boolean = false, fromMoveClick: boolean = false): Promise<void> {
        let highlightOpts: HighlightOpts = TestConfig.instance.protractorConfig.params.highlight;
        if (TestConfig.instance.protractorConfig.params.highlight && !fromMoveClick) return this.moveClick(selector, parent, resetCache, keepIframe);
        let el: ElementWrapper;
        try {
            el = await this.by(selector, parent);
            // This is better than the "minimal scroll" from Selenium's implementation (which will just put the element in the viewport)
            if (!await this.inViewport(el)) await this.scrollTo(el);
            assert(await this.visible(el)(), `Click: Can't click a non-visible element (${selector})`);
            if (highlightOpts) {
                await this.browser.sleep(highlightOpts.delay);
            }
            await el.click();
        } catch (err) {
            if ((err.message as string).indexOf('is not clickable at point') !== -1) {
                try {
                    await this.scrollTo(el, null, true);
                    await el.click();
                    return;
                } catch (error) {
                    debugger;
                }
            }
            debugger;
            assert(!err, `Click: An error occurred for ${selector && (selector instanceof ElementFinder ? selector.locator() : selector['value'])}: ${err}`);
        } finally {
            if (resetCache) this.browser.resetCache(keepIframe);
        }
    }

    public async type(selector: Locator | WebElement | ElementWrapper, text: string | number,
        pauseAfterChar?: number, parent?: Locator | WebElement | ElementWrapper): Promise<void> {
        let element = await this.by(selector, parent);
        assert(await element.isEnabled(), `Type: Can't write in a disabled attribute`);
        let highlight = TestConfig.instance.protractorConfig.params.highlight;
        let delay = (pauseAfterChar !== undefined && pauseAfterChar) || (highlight && highlight.delay && highlight.delay / text.toString().length);
        if (highlight) await this.move(element);
        if (delay) {
            await this.sendKeysWithDelay(element, text, delay);
        } else await element.sendKeys(text).then(null, err => {
            // Protect ourselves against an error directly on selenium driver
            // This is usually when an element can't be modified, otherwise we'll get -literally- no proper stacktrace
            assert(!err, `Type: An error occurred: ${err}. Locator: ${element.locator()}`);
        });
        if (highlight) await this.move(By.xpath('//body'));
    }

    public async typeCleared(selector: Locator | ElementWrapper,
        text: string | number, parent?: Locator | ElementWrapper): Promise<void> {
        await this.clear(selector, parent);
        if (text !== undefined && text !== null) await this.type(selector, text, 0, parent);
    }

    public async check(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper, setChecked?: boolean): Promise<void> {
        let isChecked = await this.checked(selector, parent);
        if ((setChecked !== undefined && isChecked !== setChecked) || (setChecked === undefined && !isChecked)) {
            await this.click(selector, parent);
        }
    }

    public async uncheck(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): Promise<void> {
        return this.check(selector, parent, false);
    }

    public async checked(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): Promise<boolean> {
        return await (await this.by(selector, parent)).isSelected();
    }

    public async value(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): Promise<string> {
        return this.attribute(selector, 'value', parent);
    }

    /**
     * Executes the function 'method' per each element of the selector
     *
     * @template T The results to be returned by the method
     * @param {(Locator | Array<WebElement | ElementWrapper>)} selector The 'all' selector that will grab all the elements
     * @param {Function} method The method that will be executed per each element of the 'all' selector
     * @param {(Locator | WebElement | ElementWrapper)} [parent] The parent element,
     *  to be passed to the all selector and the method that will be executed per each element
     * @param {boolean} [splitParamArray=false] If true it will assume that EACH element of params[]
     * is an array with the same size as the total elements returned by the 'all' selector
     * @param {...any[]} params The extra parameters to be passed to the method, will be passed before the 'parent' parameter
     * @returns {Promise<T[]>} The results of the method
     *
     * @memberOf ObjectHelper
     */
    public async executeArray<T>(selector: Locator | Array<WebElement | ElementWrapper>,
        method: (selector: Locator | WebElement | ElementWrapper, ...params: any[]) => Promise<T>,
        parent?: Locator | WebElement | ElementWrapper, splitParamArray: boolean = false, ...params: any[]): Promise<T[]> {
        if (!params) params = [];
        if (Locator.instanceOf(selector)) selector = await this.all(selector, parent);
        let results: T[] = [], i = 0;
        if (splitParamArray) {
            // Split the parameters
            let prs: [any][] = [];
            for (let param of params) {
                assert(param instanceof Array, `ExecuteArray: ${param} needs to be an array`);
                assert((param as any[]).length === (selector as any[]).length, `ExecuteArray: ${param} needs to have exactly the same amount of elements as the selector`);
                for (let i in param as any[]) {
                    if (!prs[i]) prs[i].push([]);
                    prs[i].push(param[i]);
                }
            }
            params = prs;
        }
        for (let [idx, el] of (selector as Array<WebElement | ElementWrapper>).entries()) {
            let callArray: Array<{}> = [el];
            if (params.length) callArray = callArray.concat(splitParamArray ? params[idx] : params);
            callArray.push(parent);
            results.push(await method.apply(this, callArray));
        }
        return results;
    }

    public async attribute(selector: Locator | ElementWrapper,
        attribute: string, parent?: Locator | ElementWrapper): Promise<string> {
        return await (await this.by(selector, parent)).getAttribute(attribute);
    }

    public async text(selector: Locator | ElementWrapper, parent?: Locator | ElementWrapper): Promise<string> {
        return await (await this.by(selector, parent)).getText();
    }

    public async number(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): Promise<number> {
        let text = /(\d+)/.exec(await this.text(selector, parent));
        return text && text.length === 2 ? parseInt(text[1]) : NaN;
    }

    public async present(selector: Locator | ElementWrapper, parent?: Locator | ElementWrapper): Promise<boolean> {
        return await this.browser.present(selector, parent);
    }

    public async displayed(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): Promise<boolean> {
        return await this.present(selector, parent) && await (await this.by(selector, parent, false)).isDisplayed();
    }

    // I think all of these should return promises, but somehow they work
    public visible(locator: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): () => Promise<boolean> {
        return this.browser.visible(locator, parent);
    }

    public invisible(locator: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): () => Promise<boolean> {
        return async () => {
            return !(await this.visible(locator, parent)());
        };
    }

    public clickable(locator: Locator | ElementWrapper, parent?: ElementWrapper): () => any {
        return EC.elementToBeClickable(locator instanceof ElementWrapper ?
            locator : parent ? parent.element(locator) :
                this.browser.elementWrapper.create(this.browser.element(locator))) as () => any;
    }

    public stale(locator: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper) {
        return async () => {
            let res = await this.present(locator, parent).then(res => {
                return !res;
            }).catch(res => {
                return true;
            });
            return res;
        };
    }

    public async move(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): Promise<void> {
        let el = await this.by(selector, parent);
        try {
            await this.browser.actions().mouseMove(el).perform();
        } catch (error) { // Can't move the mouse to an element inside an iframe, an error will be expected in these scenarios
            console.warn(`Mouse Move - Error while trying to move the mouse to ${el.locator()}: ${error}`);
        }
    }

    public async moveClick(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper, resetCache: boolean = true, keepIframe: boolean = false): Promise<void> {
        let element = await this.by(selector, parent);
        await this.wait(this.visible(element), `Timeout: Element should be visible before clicking it`);
        await this.move(element);
        await this.click(element, null, resetCache, keepIframe, true);
    }

    public async clear(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): Promise<void> {
        let el = await this.by(selector, parent);
        let enabled = await el.isEnabled();
        assert(enabled, `Clear: Can't write in a disabled attribute`);
        await el.clear().then(null, err => {
            // Protect ourselves against an error directly on selenium driver
            // This is usually when an element can't be modified, otherwise we'll get -literally- no proper stacktrace
            debugger;
            assert(!err, `Clear: An error occurred: ${err}. Locator: ${el.locator()}`);
        });
    }

    public async enabled(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): Promise<boolean> {
        return await (await this.by(selector, parent)).isEnabled();
    }

    public async selected(selector: Locator | ElementWrapper,
        parent?: Locator | ElementWrapper): Promise<boolean> {
        return await (await this.by(selector, parent)).isSelected();
    }

    public get key() {
        return protractor.Key;
    }

    public async back(): Promise<void> {
        return this.browser.back();
    }

    public async get(destination: string, timeout: number = this.browser.allScriptsTimeout) {
        await this.browser.get(destination, timeout);
    }

    public async wait<T>(untilCondition: () => T | Promise<T> | ProtractorPromise.Promise<T> | Function,
        text: string, timeout: number = this.browser.allScriptsTimeout, throwAfterTimeout: boolean = true): Promise<T> {
        return this.browser.waitFor(untilCondition, text, timeout, throwAfterTimeout);
    }

    private async sendKeysWithDelay(el: ElementWrapper, text: string | number, pauseAfterChar: number = 50): Promise<void> {
        text = text.toString();
        for (let i = 0; i < text.length; i++) {
            await this.browser.sleep(pauseAfterChar * 2);
            await el.sendKeys(text[i]);
            await this.browser.sleep(pauseAfterChar);
        }
    }

    public sortObject(tempHolder: Object): SortedObject {
        let values: string[] = [], keys: string[] = [];
        for (let key of Object.keys(tempHolder).sort((a, b) => a < b ? -1 : a > b as any)) {
            values.push(tempHolder[key]);
            keys.push(key);
        }
        return { keys: keys, values: values };
    }

    public eurToNumber(eur: string): NumberRange {
        let re = /(\d+)\.?(\d*)[\s\b]*/g, minimum = re.exec(eur), maximum = re.exec(eur);
        return {
            minimum: minimum ? parseInt(`${minimum[1]}${minimum.length > 2 ? minimum[2] : ''}`) : null,
            maximum: maximum ? parseInt(`${maximum[1]}${maximum.length > 2 ? maximum[2] : ''}`) : null,
        };
    }

    public parseDate(date: string): Date {
        let matches = /(\d{2}\/\d{2}\/\d{2,4})/.exec(date);
        if (matches.length < 2) return null;
        return moment(matches[1], 'DD/MM/YYYY').toDate();
    }

    public async html(elem: Locator | ElementWrapper | WebElement, parent?: Locator | ElementWrapper | WebElement): Promise<string> {
        return (await this.by(elem, parent)).getHtml();
    }

    public async loadSaved<T>(key: StoreObject<T>, fun: () => Promise<T>): Promise<T> {
        assert(key != null, `Error: Can't store values in a null reference`);
        return key.value !== undefined ? key.value : key.value = await fun();
    }
}

export class Alert {
    constructor(private oh: ObjectHelper) { }
    public async accept(): Promise<void> {
        await this.oh.browser.switchTo().alert().accept();
    }
    public async cancel(): Promise<void> {
        await this.oh.browser.switchTo().alert().dismiss();
    }
    public async authenticate(username: string, password: string): Promise<void> {
        await this.oh.browser.switchTo().alert().authenticateAs(username, password);
    }
    public async setText(text: string): Promise<this> {
        await this.oh.browser.switchTo().alert().sendKeys(text);
        return this;
    }
    public async text(): Promise<string> {
        return await this.oh.browser.switchTo().alert().getText();
    }
    public get present(): Promise<boolean> {
        return this.text().then(() => true, error => false);
    }
    public waitForAlert(): Promise<this> {
        return this.oh.wait(() => this.present, `Alert - Timeout! Waiting for alert to be present`).then(() => this);
    }
    public processAlert(accept: boolean): Promise<void> {
        return this.waitForAlert().then(() => accept ? this.accept() : this.cancel());
    }
}
