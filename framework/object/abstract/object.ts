import { Locator, oh } from '../../helpers';
import { dirty } from '../core/decorators';
import { FnNames, generateName, isMetadataField } from '../core/shared';
import { propertyDescriptor, InitMode, InitOpts, injectKey, InjectArgs, classExtensionDecorator, IConstructor } from '../core/iConstructor';
import { internal } from '../core/shared';
import { IImplementable } from '../core/iImplementable';
import { IDataModelObject } from '../core/iDataModelObject';

const internalTimeout: Symbol = Symbol('timeout');

interface InternalTimeout {
    timeout: number;
    throwAfterTimeout: boolean;
}

export function waitForPresence(timeout: number, throwAfterTimeout: boolean) {
    return function (target: Object, property: string | symbol) {
        //if (Reflect.getMetadata('design:type', target, property) instanceof AbstractObject.constructor) {
        Reflect.defineMetadata(internalTimeout, { timeout: timeout, throwAfterTimeout: throwAfterTimeout } as InternalTimeout, target, property);
    };
}

/**
 * Used to indicate when an AbstractObject *property* is optional.
 *
 * @param {Object} target
 * @param {string | symbol} property
 * @export
 */
export function optional(target: Object, property: string | symbol) {
    waitForPresence(0, false)(target, property);
}

const visible: Symbol = Symbol('visible');
/**
 * Used to indicate when an AbstractObject *property* is optional.
 *
 * @param {Object} target The target class
 * @export
 */
export function forceVisibility(target: Object) {
    Reflect.defineMetadata(visible, true, target);
}

export interface AbstractObjectInitOpts extends InitOpts {
    timeout?: number;
    throwAfterTimeout?: boolean;
}

export abstract class AbstractObject<I extends AbstractObjectInitOpts = AbstractObjectInitOpts> extends IImplementable<I> {
    @internal public mandatoryLocator: Locator = null;
    @internal public optionalLocator: Locator = null;
    @internal public errorLocator: Locator = null;
    public async optionalMandatoryFields(): Promise<{ optional: string[], mandatory: string[] }> {
        if (!this.mandatoryLocator || !this.optionalLocator) return null;
        let optional: string[] = [];
        let mandatory: string[] = [];
        for (let property of this.getAllProperties()) {
            if (isMetadataField(property)) continue;
            let descriptor = propertyDescriptor(this, property);
            if (descriptor.value instanceof AbstractObject) {
                let res = await (this[property] as AbstractObject).optionalMandatoryFields();
                if (res && res.mandatory.length) mandatory.push(property);
                else if (res && res.optional.length && !res.mandatory.length) optional.push(property);
                continue;
            }
            let locator: Locator = this[generateName(FnNames.Main, property)];
            if (locator && await oh.present(locator, this.element)) {
                let generalLocator = await oh.all(locator, this.element);
                for (let loc of generalLocator) {
                    if (await oh.present(this.mandatoryLocator, loc)) {
                        mandatory.push(property);
                        break;
                    } else if (await oh.present(this.optionalLocator, loc) && await oh.visible(this.optionalLocator, loc)()) {
                        optional.push(property);
                        break;
                    }
                }
            }
        }
        return { optional: optional, mandatory: mandatory };
    }

    public async findErrors(): Promise<string[]> {
        if (!this.errorLocator) return null;
        let errors: string[] = [];
        for (let property of this.getAllProperties()) {
            if (isMetadataField(property)) continue;
            let locator: Locator = this[generateName(FnNames.Main, property)];
            let descriptor = propertyDescriptor(this, property);
            if (descriptor.value instanceof AbstractObject) {
                let res = await (this[property] as AbstractObject).findErrors();
                if (res && res.length) errors.push(property);
                continue;
            }
            if (locator && await oh.present(locator, this.element)) {
                let generalLocator = await oh.by(locator, this.element, false);
                if (await oh.present(this.errorLocator, generalLocator)) {
                    errors.push(property);
                }
            }
        }
        return errors;
    }

    /**
     * Applies any changes done to the Object itself to the page (by calling the set method)
     * @param {boolean} dirtyOnly Indicates whether to only apply these values that have been modified
     * @returns {Promise<this>} This element, for chaining
     */
    public async apply(dirtyOnly: boolean = true): Promise<this> {
        for (let property of this.sortProperties()) {
            let descriptor = propertyDescriptor(this, property);
            if (!descriptor) debugger;
            if (descriptor.value instanceof AbstractObject) await (this[property] as AbstractObject).apply();
            else {
                let fn: (el: any) => Promise<void> = this[generateName(FnNames.Set, property)];
                if (fn && (!dirtyOnly || Reflect.getMetadata(dirty, this, property))) {
                    Reflect.deleteMetadata(dirty, this, property);
                    await fn.call(this, this[property], true);
                }
            }
        }
        return this;
    }

    public async fill<T extends IDataModelObject>(dataObject: T | T[], strictDOCheck = true): Promise<this> {
        if (!(dataObject instanceof Array)) dataObject = [dataObject];
        for (let data of dataObject) {
            let dataProps = this.getAllProperties(data);
            let thisProps = this.getAllProperties();
            if (strictDOCheck && dataProps.findIndex(el => thisProps.findIndex(el1 => el === el1) === -1) !== -1)
                continue; // 'This' object is not implementing the dataModel
            for (let property of this.sortProperties(thisProps)) {
                if (!(property in data)) continue;
                let val = data[property];
                let descriptor = propertyDescriptor(this, property);
                if (!descriptor) debugger;
                if (descriptor.value instanceof AbstractObject) {
                    if (val) await (this[property] as AbstractObject).fill(val, strictDOCheck);
                } else {
                    let fn: (el: any) => Promise<void> = this[generateName(FnNames.Set, property)];
                    if (fn) {
                        await fn.call(this, val);
                    }
                }
            }
        }
        return this;
    }

    public async refresh(propertyNames: string | string[] = this.getAllProperties(), recursive: boolean = true): Promise<this> {
        propertyNames = propertyNames || this.getAllProperties();
        if (!Array.isArray(propertyNames)) propertyNames = [propertyNames];
        // Here refresh dynamically all the get methods
        for (let property of this.sortProperties(propertyNames)) {
            let descriptor = propertyDescriptor(this, property);
            if (!descriptor) debugger;
            let metadata: InjectArgs = Reflect.getMetadata(injectKey, this, property);
            if (metadata && descriptor.value === undefined) await this.setupProperties(<any>{ mode: InitMode.SingleObject }, [property]);
            descriptor = propertyDescriptor(this, property); // Refresh the descriptor
            if (recursive && descriptor.value instanceof Array) {
                for (let el of this[property]) await (el as AbstractObject).refresh();
            }
            else if (recursive && descriptor.value instanceof AbstractObject) {
                // We assume that every property will be shown when the parent property is shown already... maybe this is not right
                await (this[property] as AbstractObject).refresh();
            } else {
                let fn: () => Promise<any> = this[generateName(FnNames.Get, property)];
                if (fn) {
                    await fn.call(this);
                }
            }
        }
        return this;
    }

    @internal public async wait(timeout: number = undefined, throwAfterTimeout: boolean = true): Promise<this> {
        if (timeout !== 0 || throwAfterTimeout) {
            await this.enterLocalIframeSpace(true);
            let _ = this, fn = async function () {
                return await oh.present(this.element);
            };
            await oh.wait(async function () {
                return await fn.apply(_);
            }, 'Timeout: Waiting for the Element to load', timeout, throwAfterTimeout);
            await this.exitLocalIframeSpace();
        }
        return this;
    }

    protected async weightedInit(opts: I): Promise<[this, number]> {
        opts.mode = opts.mode === undefined ? InitMode.SingleObject : opts.mode;
        opts.timeout = opts.timeout === undefined ? 0 : opts.timeout;
        opts.throwAfterTimeout = opts.throwAfterTimeout === undefined ? false : opts.throwAfterTimeout;
        return super.weightedInit(opts);
    }

    public async init(opts: I = <I>{ mode: InitMode.Full, throwAfterTimeout: true }): Promise<this> {
        try {
            if (!await this.enterLocalIframeSpace(opts.timeout > 0 || opts.timeout === undefined))
                return null; // There's no path to the element
            if (opts.parent) {
                let metadata: InternalTimeout = Reflect.getMetadata(internalTimeout, opts.parent.element, opts.parent.propertyName);
                if (metadata) {
                    opts.timeout = metadata.timeout;
                    opts.throwAfterTimeout = metadata.throwAfterTimeout;
                }
            }
            await this.wait(opts.timeout, opts.throwAfterTimeout);
            let visibilityCheckFailed = classExtensionDecorator<boolean>(this, visible) && !await oh.visible(this.element)();
            if (visibilityCheckFailed) return undefined;
            let instance = await super.init(opts);
            if (!instance) return undefined;
            if (opts.mode !== InitMode.Full) return instance;
            // If we're running init in Full Mode, super.init() will already have initialized our children
            if (instance instanceof Array) {
                if (!instance.length) return undefined;
                for (let ins of instance as Array<this>) await ins.refresh(null, false);
            } else await instance.refresh(null, false);
            return instance;
        } finally {
            await this.exitLocalIframeSpace();
        }
    }

    @internal public async load(wait: boolean = true): Promise<this> {
        let opts = <I>{ mode: InitMode.SingleObject };
        if (!wait) {
            opts.throwAfterTimeout = false;
            opts.timeout = 0;
        }
        return await this.init(opts);
    }

    public static async WaitForPage<T extends IImplementable>(pages: any[] | any,
        resetCache: boolean = true, ...args): Promise<T> {
        if (!(pages instanceof Array)) pages = [pages];
        return await oh.wait(async () => {
            for (let page of pages) {
                if (resetCache) oh.browser.resetCache();
                let res;
                if (this.findMatching(page)) res = await IConstructor.Get(page, args);
                else res = await (new (Function.prototype.bind.apply(page, [null].concat(args))))
                    .init(<AbstractObjectInitOpts>{ mode: InitMode.SingleObject, timeout: 1000, throwAfterTimeout: false });
                if (res) return res as T;
            }
            return null;
        }, `PageObject - Error! Timeout waiting for one of the pages to load`);
    }
}
