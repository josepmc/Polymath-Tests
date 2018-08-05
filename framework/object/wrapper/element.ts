import {
    ElementFinder,
    ProtractorBrowser,
    WebElement,
} from 'protractor';
import { ILocation, ISize } from 'selenium-webdriver';
import { OldMethods, fillImplemented } from './shared';
import { Locator, By } from '../../helpers';

export class ElementWrapper extends ElementFinder implements OldMethods<ElementFinder> {
    /**
     * Indicates the position of the element within it's parent
     * This is only used in case the element has siblings (e.g. created through 'all')
     * @type {number}
     * @memberof ElementWrapper
     */
    public index: number;
    public oldMethods: ElementFinder;
    protected constructor(element: ElementFinder, public parent?: ElementWrapper) {
        super(element.browser_, element.elementArrayFinder_);
    }

    public static create(element: ElementFinder, parent?: ElementWrapper, idx?: number): ElementWrapper {
        let created = new this(element, parent);
        let res = fillImplemented(created as any, element) as ElementWrapper;
        res.index = idx;
        return res;
    }

    public static fromWebElement_(browser: ProtractorBrowser, webElem: WebElement, locator?: Locator, parent?: ElementWrapper): ElementWrapper {
        return this.create(ElementFinder.fromWebElement_(browser, webElem, locator), parent);
    }

    public hash() {
        let thisHash = this.locator()['value'];
        if (this.parent) thisHash = this.parent.hash() + thisHash;
        return thisHash + (this.index >= 0 ? `[${this.index}]` : '');
    }

    public element(subLocator: Function | Locator) {
        return (this.browser_.elementWrapper || ElementWrapper).create(this.oldMethods.element(subLocator), this);
    }

    private _text: string;
    public getText(force?: boolean): any {
        return this._text !== undefined ? new Promise<string>(r => r(this._text)) : this.oldMethods.getText();
    }
    private _html: string;
    public getHtml(force?: boolean): any {
        return (!force && this._html !== undefined) ? new Promise<string>(r => r(this._html)) :
            this.browser_.executeScript('return arguments[0].outerHTML;', this);
    }
    private _webElement: WebElement;
    public getWebElement(force?: boolean): any {
        return (!force && this._webElement !== undefined) ? new Promise<WebElement>(r => r(this._webElement)) : this.oldMethods.getWebElement();
    }
    private _size: ISize;
    public getSize(force?: boolean): any {
        return (!force && this._size !== undefined) ? new Promise<ISize>(r => r(this._size)) :
            this.oldMethods.getSize().then(size => this._size = size);
    }
    private _location: ILocation;
    public getLocation(force?: boolean): any {
        return (!force && this._location !== undefined) ? new Promise<ILocation>(r => r(this._location)) :
            this.oldMethods.getLocation().then(location => this._location = location);
    }
    private _attribute: { [k: string]: string };
    public getAttribute(attribute: string, force?: boolean): any {
        this._attribute = this._attribute || {};
        return (!force && this._attribute[attribute] !== undefined) ? new Promise<string>(r => r(this._attribute[attribute])) : this.oldMethods.getAttribute(attribute);
    }
    private _present: boolean;
    public isPresent(force?: boolean): any {
        return (!force && this._present) ? new Promise<boolean>(r => r(this._present)) : this.oldMethods.isPresent();
    }
    private _selected: boolean;
    public isSelected(force?: boolean): any {
        return (!force && this._selected) !== undefined ? new Promise<boolean>(r => r(this._selected)) : this.oldMethods.isSelected();
    }
    private _displayed: boolean;
    public isDisplayed(force?: boolean): any {
        return (!force && this._displayed) !== undefined ? new Promise<boolean>(r => r(this._displayed)) : this.oldMethods.isDisplayed();
    }
    private _enabled: boolean;
    public isEnabled(force?: boolean): any {
        return (!force && this._enabled !== undefined) ? new Promise<boolean>(r => r(this._enabled)) : this.oldMethods.isEnabled();
    }
    public sendKeys(text: any): any {
        // TODO(@JCM): When using seed 2 in the test case PlacingAd_Smoke, it shows error 'Error: ENAMETOOLONG: name too long'
        // The string to send should be partioned in chunks instead of sending all at once
        this._text = undefined;
        this._attribute = undefined;
        return this.oldMethods.sendKeys(text);
    }
    public clear() {
        this._text = undefined;
        this._attribute = undefined;
        return this.oldMethods.clear();
    }
    public click(): any {
        this._selected = undefined;
        if (this.browser_.events.listenerCount('pageChange')) {
            return this.browser_.element(By.css('body')).getHtml().then(body => {
                return this.oldMethods.click().then(() => { return this.browser_.element(By.css('body')).getHtml(); }).then(newBody => {
                    if (body !== newBody) this.browser_.events.emit('pageChange', this.browser_);
                });
            });
        }
        return this.oldMethods.click();
    }
    public async inViewport(): Promise<boolean> {
        try {
            let size = await this.getSize();
            let location = await this.getLocation();
            let browserSize = await this.browser_.getSize();
            let x = browserSize.width;
            let y = browserSize.height;
            let x2 = size.width + location.x;
            let y2 = size.height + location.y;
            return x2 <= x && y2 <= y;
        } catch (e) {
            console.log(`InViewport: Skipping due to ${e}`);
            return false;
        }
    }
}
// IMPORTANT! This ensures that we're not initializing the object and that we replace the methods we implement
Object.setPrototypeOf(ElementWrapper, Object);

export class MobileElement extends ElementWrapper {
    public getHtml() {
        console.log('getHtml - method not implemented');
        return null;
    }

    public getAttribute(attribute: string, force?: boolean) {
        try {
            return super.getAttribute(attribute, force);
        } catch (exception) {
            // Appium throws an exception if the attribute doesn't exist
            console.log(exception);
            return null;
        }
    }
    public async isSelected(force?: boolean) {
        try {
            return await super.isSelected(force);
        } catch (e) {
            //console.warn(`Mobile Element: An error ocurred while checking whether an element is selected: ${e}`);
            return false;
        }
    }
    public async isChecked(force?: boolean) {
        try {
            return await super.isChecked(force);
        } catch (e) {
            //console.warn(`Mobile Element: An error ocurred while checking whether an element is selected: ${e}`);
            return false;
        }
    }
    public async inViewport(): Promise<boolean> {
        return false;
    }
}

export class AndroidElement extends MobileElement {
    public getId() {
        return this.getAttribute('resourceId');
    }
    public getDescription(): Promise<string> {
        return this.getAttribute('contentDescription');
    }
}
