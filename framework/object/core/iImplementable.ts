import { ElementWrapper, Locator, oh, WindowInfo, By } from '../../helpers';
import { propertyDescriptor, InitMode, InitOpts, IConstructor, classExtensionDecorator } from './iConstructor';
import { internal, internalKey, recurseClass } from './shared';
import stackTrace = require('stack-trace');

const iframeSymbol: Symbol = Symbol('iframe');
export function iframe(iframeName: Locator = null) {
    return function (target: Object) {
        let metadata = Reflect.getMetadata(iframeSymbol, target) as Array<Locator> || [];
        metadata.push(iframeName);
        Reflect.defineMetadata(iframeSymbol, metadata, target);
    };
}
const changesContentSymbol: Symbol = Symbol('changesContent');
export function changesContent(target: Object) {
    Reflect.defineMetadata(changesContentSymbol, true, target);
}
let overrideArray: { [key: string]: { constructor: Function, className: string[] } } = {};
const overrideSymbol: Symbol = Symbol('overrideLocator');
export function overrideLocator(target: IImplementable, property: string | symbol) {
    Reflect.defineMetadata(overrideSymbol, true, target.constructor);
}
const angularKey: Symbol = Symbol('angular');
export function angular(target: Object) {
    Reflect.defineMetadata(angularKey, true, target);
}
export abstract class IImplementable<I extends InitOpts = InitOpts> extends IConstructor<I> {
    @internal private _featureSelector: Locator;
    @internal private featureLocatorList: Locator[] = [];
    @internal protected readonly abstract featureSelector: Locator;

    @internal private craftCompoundFeatureSelector() {
        // Get all inherited
        let property = this.featureLocatorList;
        if (!property.length) debugger;
        let parent = this._element || this.parentElement;
        for (let prop of property) {
            if (!prop || (prop['using'] === 'xpath' && prop['value'] === 'self::*')) continue;
            if (!parent) parent = oh.browser.element(prop) as ElementWrapper;
            else parent = parent.element(prop);
        }
        return parent;
    }

    @internal private _element: ElementWrapper;
    @internal public get element(): ElementWrapper {
        return this.craftCompoundFeatureSelector();
    }
    public set element(el: ElementWrapper) {
        this._element = el;
    }
    protected injectArgs(): any[] {
        return [this];
    }
    @internal public parent: IImplementable;
    @internal private _parentElement: ElementWrapper;
    @internal public get parentElement(): ElementWrapper {
        return this._parentElement === undefined ?
            (this.parent && WindowInfo.iframeStructureEquals(this.objectIframePath, this.parent.objectIframePath) ? this.parent.element : null)
            : this._parentElement;
    }
    public constructor(parent?: IImplementable, element?: ElementWrapper) {
        super();
        this.parent = parent;
        this.element = element;
        Object.defineProperty(this, 'featureSelector', {
            get: function () {
                return this._featureSelector;
            },
            set: (loc: Locator) => {
                // This would be done way quicker if we were out of 'strict mode'
                // But ES6 modules force us to do this...
                // let caller = set.caller;
                // The call that we care about is the one before us
                let stack = stackTrace.parse(new Error())[1], hasOverride = false;
                if (stackTrace.get()[1].isConstructor()) {
                    // Special Case as we are executing the final class's code
                    hasOverride = Reflect.getOwnMetadata(overrideSymbol, this.constructor);
                } else if (!stack.native && stack.typeName === this.constructor.name) {
                    // this method name is the last after the point
                    recurseClass(this, (obj: Object, functionName: string) => {
                        let methodName = functionName.substring(functionName.lastIndexOf('.') + 1), typeName = functionName.substring(0, functionName.lastIndexOf('.'));
                        if (methodName === stack.methodName) {
                            let meta = Reflect.getOwnMetadata(overrideSymbol, obj.constructor);
                            if (meta) {
                                return hasOverride = true;
                            }
                        }
                        return void 0;
                    });
                }
                if (hasOverride) {
                    this.featureLocatorList = [];
                }
                this.featureLocatorList.push(loc);
                this._featureSelector = loc;
            },
            configurable: false,
        });
    }

    private replaceFeatureSelector(locator: Locator) {
        this.featureLocatorList.pop();
        this.featureLocatorList.push(locator);
        this._featureSelector = locator;
    }

    @internal protected findParent<T extends IImplementable>(elementClass: { new(...args: any[]): T } | Function) {
        let parent: IImplementable = this;
        while (parent = parent.parent) {
            if (parent instanceof elementClass) return parent;
        }
        return null;
    }

    @internal protected classIframePath(): Locator[] {
        return classExtensionDecorator<Locator[]>(this, iframeSymbol) || [];
    }

    @internal private oldIframe: WindowInfo;
    @internal private iFrameLevels: number = 0; //pseudo-mutex

    // builds up the entire iframe path
    @internal private get objectIframePath() {
        let parent = this.parent;
        let iframeList = [];
        while (parent != null) {
            iframeList = parent.classIframePath().concat(iframeList);
            parent = parent.parent;
        }
        iframeList = iframeList.concat(this.classIframePath());
        // Add the header if it's not there ==> the default frame
        return iframeList.length && iframeList[0] === null ? iframeList : [null].concat(iframeList);
    }

    @internal protected async enterLocalIframeSpace(waitForPresence: boolean = false): Promise<boolean> {
        let localIframe = this.objectIframePath;
        if (++this.iFrameLevels !== 1) return true; // We're already on the local space
        this.oldIframe = await oh.browser.currentFrame(); // iFrame Management
        if (WindowInfo.iframeStructureEquals(localIframe, this.oldIframe.iframeStructure)) {
            // We're already having the proper iframe tree
            this.oldIframe = undefined;
            return true;
        }
        // We need to 'navigate' down the iframe structure
        // We should change this in the future to avoid switching to the same over and over again
        let res = await oh.browser.switchToFrame(new WindowInfo(null, localIframe), waitForPresence);
        if (!res) this.oldIframe = undefined;
        return !!res;
    }

    @internal protected async exitLocalIframeSpace(): Promise<void> {
        if (this.iFrameLevels-- !== 1) return; // We're already on the local space
        if (this.oldIframe !== undefined) {
            await oh.browser.switchToFrame(this.oldIframe);
            this.oldIframe = undefined;
        }
    }
    /**
     * This method wraps around the properties from the object
     * Useful for doing 'init' to a certain subset of properties only
     * @param {I} opts If not null, will inject the properties. Otherwise only wraps non-wrapped elements
     * @param {string[]} propertyNames The properties to be wrapped
     * @returns {this} This, for chaining
     */
    @internal public async setup(opts: I, propertyNames: string[] = this.getAllProperties()): Promise<this> {
        if (opts != null) await super.setupProperties(opts, propertyNames);
        let usesAngular = Reflect.getMetadata(angularKey, this);
        for (let prop of propertyNames) {
            let descriptor = propertyDescriptor(this, prop);
            // avoid calling the getters over and over
            if (!descriptor) {
                debugger;
            }
            if (Reflect.getMetadata(internalKey, this, prop)) continue;
            let fn = (oldMethod) => async function (...args) {
                oh.setSynchronization(!usesAngular);
                await this.enterLocalIframeSpace();
                let res = await oldMethod.apply(this, args);
                await this.exitLocalIframeSpace();
                oh.setSynchronization(usesAngular);
                return res;
            };
            // This will convert non-async getters and setters into async ones, beware!
            if (!descriptor.configurable) continue;
            // There's virtually no way on knowing if property is declared as a promise or not
            if (descriptor.get) descriptor.get = fn(descriptor.get);
            if (descriptor.set) descriptor.set = fn(descriptor.set);
            if (descriptor.value instanceof Function) descriptor.value = fn(descriptor.value);
            Object.defineProperty(this, prop, descriptor);
        }
        return this;
    }
    @internal private wrapperApplied: boolean = false;
    @internal public async init(opts: I = <I>{ mode: InitMode.Full }): Promise<this | null> {
        let result: this | this[];
        try {
            await this.enterLocalIframeSpace();
            // HTMLs for debugging purposes
            // let parentHTML: string;
            // try {
            //     parentHTML = this.parentElement ? await oh.html(this.parentElement) : null;
            // } catch (error) {
            //     debugger; // Most probably because we're inside an iframe in an uncontrolled manner
            // }
            if (await oh.present(this.element)) {
                // let localHTML = await oh.html(this.element);
                if (opts.multiInstance) {
                    let elements = await oh.all(this.featureSelector, this.parentElement);
                    opts.multiInstance = false;
                    result = [];
                    for (let el of elements) {
                        let newCreated: this = new (Function.prototype.bind.apply(this.constructor, [null].concat(this.parent, el)));
                        // Set the locator to self, otherwise it will try again to look for the same locator
                        newCreated.replaceFeatureSelector(By.xpath('self::*'));
                        let initialized = await newCreated.init(opts);
                        if (!initialized) debugger;
                        else result.push(initialized);
                    }
                    return result as any as this;
                }
                // Workaround the fact that children may get the "parent" element before even it has been initialized
                // Solves the problem with abstract classes initializing objects before the constructor and passing "this.element" with it
                if (opts.mode !== InitMode.SingleObject && !this.wrapperApplied) {
                    await this.setup(null);
                    this.wrapperApplied = true;
                }
                result = await super.init(opts);
            } else result = null;
            if (opts.mode === InitMode.Full) {
                if (Reflect.getMetadata(changesContentSymbol, this.constructor)) {
                    // TODO: Make specific
                    oh.browser.resetCache();
                }
            }
            if (result && !opts._weighted) // Otherwise we could be executing actions when we shouldn't
                await this.afterInit(result as this, opts);
            return result as this;
        } catch (err) {
            debugger;
            throw err;
        }
        finally {
            await this.exitLocalIframeSpace();
        }
    }

    @internal protected async afterInit(result: this, opts: I): Promise<void> { }

    public async optionalMandatoryFields(): Promise<{ optional: string[], mandatory: string[] }> {
        return { optional: [], mandatory: [] }; // By default, we don't have any
    }
}
