import { recurseClass, isConstructor, classNameTree, internal, internalKey, classExtensionProperties, isMetadataField, generateName, FnNames } from './shared';
import clone = require('clone');
import { Locator, LocatorCompare, oh } from '../../helpers';
import crypto = require('crypto');

export class Container {
    [key: string]: { new(...els: any[]): IConstructor } | Container;
}

export function extPropertyDescriptor(target: Object, property: string): PropertyDescriptor[] {
    let descriptors = [];
    recurseClass(target, (obj, className) => {
        let descriptor = Object.getOwnPropertyDescriptor(obj, property);
        if (descriptor) descriptors.push(descriptor);
    });
    return descriptors;
}

export function propertyDescriptor(target: Object, property: string): PropertyDescriptor {
    let descriptors = extPropertyDescriptor(target, property);
    // We'll take the first definition (closest), each redefinition adds a descriptor
    return descriptors.length ? descriptors[0] : null;
}

export function classExtensionDecorator<T>(target: Object, decorator: Symbol): T {
    let obj = isConstructor(target) ? target : target.constructor;
    return Reflect.getMetadata(decorator, obj);
}

export function injectable<T extends { new(...args: any[]): IConstructor }>(constructor: T) {
    IConstructor.Register(classNameTree(constructor).reverse(), constructor);
}

export const injectKey: Symbol = Symbol('inject');

export interface InjectArgs {
    class: { (...args: any[]): IConstructor };
    additionalArgs: (() => {})[];
    initOpts?: InitInjectOpts;
}

export function inject<T>(classToInstantiate: T, initOpts?: InitInjectOpts, args?: (() => {})[]) {
    return (target: Object, appliedProperty: string | symbol) => {
        Reflect.defineMetadata(injectKey,
            { class: classToInstantiate as any as { (...args: any[]): IConstructor }, additionalArgs: args, initOpts: initOpts } as InjectArgs, target, appliedProperty);
        // The following is needed as unless a property is initialized (e.g. to undefined) we won't be able to see it
        // (e.g. TypeScript doesn't autoinitialize unused properties)
        target[appliedProperty] = target[appliedProperty] || undefined;
    };
}

export enum InitMode {
    SingleObject = 1 << 1,
    OnlyObjects = 1 << 2,
    Full = 1 << 3,
}

export interface InitInjectOpts {
    mode?: InitMode;
    multiInstance?: boolean;
    initArgs?: any[];
}
export interface InitOpts extends InitInjectOpts {
    mode: InitMode;
    parent?: { element: IConstructor, propertyName: string };
    _weighted?: boolean; // Used so that we don't execute certain actions if we're only evaluating
    [k: string]: any;
}
export interface CompareOptions {
    /**
     * Whether to ignore class equalty
     */
    ignoreClass?: boolean;
    /**
     * Whether to ignore case when comparing two strings
     */
    caseInsensitive?: boolean;
    /**
     * Whether to check that the string is contained, instead of an absolute equals
     */
    stringContains?: boolean;
    /**
     * Whether to consider that undefined values (in the passed object) indicate that the property is not present
     * This should be used when comparing DOs with POs, but can also hide problems with not captured fields
     */
    undefinedEqualsNotPresent?: boolean;
    /**
     * If not null, this object will be filled in with a hierarchical map of the differences
     */
    differenceArray?: Object;
    /**
     * Don't compare only metadata fields
     */
    ignoreMetadata?: boolean;
    /**
     * Custom compare method for 'leaf' values
     */
    compareFn?: (property: string, thisProperty: Object, thatProperty: Object) => boolean;
}

export abstract class IConstructor<I extends InitOpts = InitOpts> {
    ///////////////////////////////////////////////////////////// IoC
    @internal protected injectArgs(): any[] { return []; }
    @internal protected async init(opts: I = <I>{ mode: InitMode.Full }): Promise<this> {
        // Only initialize properties if we're not in Single Object Mode
        if (opts.mode ^ InitMode.SingleObject) return this.setupProperties(opts);
        return this;
    }

    @internal protected async setupProperties(opts: I, propertyNames: string[] = this.getAllProperties(), ) {
        for (let prop of propertyNames) {
            let metadata: InjectArgs = Reflect.getMetadata(injectKey, this, prop);
            let descriptor = propertyDescriptor(this, prop);
            // Inject any properties
            if (metadata) {
                let args: any[] = [].concat(this.injectArgs());
                if (metadata.additionalArgs) {
                    for (let arg of metadata.additionalArgs) {
                        args.push(await arg());
                    }
                }
                let newOpts = metadata.initOpts ? {
                    mode: metadata.initOpts.mode === undefined ? opts.mode : metadata.initOpts.mode,
                    multiInstance: metadata.initOpts.multiInstance === undefined ? opts.multiInstance : metadata.initOpts.multiInstance,
                    initArgs: metadata.initOpts.initArgs === undefined ? opts.initArgs : metadata.initOpts.initArgs,
                } as I : opts;
                // Get already executes weightedInit
                this[prop] = await IConstructor.Get(metadata.class, args, newOpts);
            }
            if (Reflect.getMetadata(internalKey, this, prop)) continue;
            // Initialize any IConstructor Properties
            if (!metadata && descriptor.value instanceof IConstructor) {
                let oldParent = opts.parent;
                opts.parent = opts.parent || { element: this, propertyName: prop };
                this[prop] = await (this[prop] as IConstructor).weightedInit(opts);
                if (this[prop]) this[prop] = this[prop][0];
                opts.parent = oldParent;
            }
        }
        return this;
    }

    // We use weighted init to prepare the parameter callstack for init
    @internal protected async weightedInit(opts: I = <I>{ mode: InitMode.SingleObject }): Promise<[this, number]> {
        opts._weighted = true;
        let res = await this.init(opts);
        opts._weighted = false;
        return (res !== null && res !== undefined) ?
            [res, this.className.length] as [this, number] : null;
    }
    @internal public static recurse(container: Container) {
        if (!(container instanceof Container)) return [container];
        let total = [];
        for (let item in container) {
            total = total.concat(this.recurse(container[item] as Container));
        }
        return total;
    }
    protected static findMatching(type: any) {
        let classNames = classNameTree(type).reverse();
        let container = this._container;
        let matching = null;
        for (let className: string, i = 0; i < classNames.length; ++i) {
            className = classNames[i];
            if (i + 1 === classNames.length) {
                if (!(className in container)) {
                    debugger;
                    console.log(`Error! ${className} is not registered`);
                } else matching = container[className];
            } else if (className in container) {
                if (container[className] instanceof Container) {
                    container = container[className] as Container;
                } else {
                    // Error, it exists but it shouldn't be a class
                    debugger;
                    console.log(`Error! ${className} is already registered but we didn't finish the tree`);
                }
            } else {
                console.log(`Error! Couldn't find ${className}`);
            }
        }
        return matching;
    }
    private static baseKey: string = 'register:base';
    // Affected by https://github.com/Microsoft/TypeScript/issues/15997
    public static async Get<T extends IConstructor<I>, I extends InitOpts = InitOpts>(type: any, args: any[] = [], opts: I = <I>{ mode: InitMode.SingleObject }): Promise<T> {
        // Return all classes that implement T
        let matching = this.findMatching(type);
        if (!matching) {
            console.log('error');
            debugger;
        }
        let matchingMatches = this.recurse(matching);
        let res = [];
        for (let type of matchingMatches) {
            try {
                let created: IConstructor = new (Function.prototype.bind.apply(type, [null].concat(args)));
                let init = await created.weightedInit(opts);
                if (init) res.push(init);
            } catch (error) {
                debugger;
            }
        }
        //assert(res.length, `Couldn't find any non-empty element. The element doesn't exist in ${type} using ${args}`);
        return res.length ? res.sort((a, b) => b[1] - a[1])[0][0] : null;
    }
    // If we had proper reflection, we wouldn't need this
    private static _container: Container = new Container();
    // IConstructor.Register(this.className, (this as Object).constructor as { new (...els: any[]): IConstructor });
    public static Register<T extends IConstructor>(classNames: string[], type: { new(...els: any[]): T }) {
        let container = this._container;
        for (let className: string, i = 0; i < classNames.length; ++i) {
            className = classNames[i];
            if (i + 1 === classNames.length) {
                if (className in container) {
                    console.log(`Error! ${className} is already registered`);
                } else container[className] = type;
            } else if (className in container) {
                if (container[className] instanceof Container) {
                    container = container[className] as Container;
                } else {
                    // For inheritance
                    let temp = container[className];
                    container[className] = new Container();
                    container[className][this.baseKey] = temp;
                    container = container[className] as Container;
                }
            } else {
                container[className] = new Container();
                container = container[className] as Container;
            }
        }
    }
    @internal public get className(): string[] {
        return classNameTree(this);
    }
    ///////////////////////////////////////////////////////////// End - IoC

    private isMethodOverriden(name: string, target: Object): boolean {
        let current = target[name], impl = [];
        recurseClass(target, (obj, className) => {
            if (obj[name] !== current) impl.push(obj[name]);
        });
        return !!impl.length;
    }

    public async arrayEquals<T>(arr1: Array<T>, arr2: Array<T>, opts?: CompareOptions): Promise<boolean> {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; ++i) {
            if (typeof arr1[i] === 'number' && typeof arr2[i] === 'number'
                && isNaN(arr1[i] as any) && isNaN(arr2[i] as any)) continue;
            else if (arr1[i] instanceof IConstructor && arr2[i] instanceof IConstructor) {
                if (!await (arr1[i] as any).equals(arr2[i], opts)) return false;
            }
            else if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }

    /**
     * This method compares the current class with another IConstructor class, and returns whether they have the same values in the fields.
     * You should also call this method from the object that has the 'least' amount of fields you want to compare (e.g. call it from a DO, not from a PO)
     * @param {T} param The other parameter to compare to
     * @param {CompareOptions} opts Contains the different options for comparison
     * @returns {boolean} Indicates equality
     */
    public async _equals<T extends IConstructor>(param: T, opts: CompareOptions): Promise<boolean> {
        if (!param) return false;
        if (!opts) opts = {};
        let localDifferences = {};
        for (let property of this.sortProperties()) {
            //if (!allEquals) break;
            let localEqual = true;
            if (Reflect.getMetadata(internalKey, this, property) || (!opts.ignoreMetadata && isMetadataField(property))) continue;
            let descriptor = propertyDescriptor(this, property);
            if (!descriptor) debugger;
            if (descriptor.value instanceof Function) continue;
            // getter / setter or normal values
            let thisProperty = await this[property], paramProperty = await param[property], tempObj = {};
            if (paramProperty === undefined && opts.undefinedEqualsNotPresent) continue;
            if (Locator.instanceOf(thisProperty) && Locator.instanceOf(paramProperty)) {
                localEqual = LocatorCompare(thisProperty, paramProperty);
            } else if (thisProperty instanceof IConstructor && paramProperty instanceof IConstructor) {
                if (thisProperty === undefined || paramProperty === undefined) continue;
                let newOpts = clone(opts);
                newOpts.differenceArray = tempObj;
                localEqual = await thisProperty.equals(paramProperty, newOpts);
                if (localEqual && this.isMethodOverriden('equals', paramProperty) && thisProperty.equals !== paramProperty.equals)
                    localEqual = await paramProperty.equals(thisProperty, newOpts);
            } else if (thisProperty instanceof Array && paramProperty instanceof Array) {
                localEqual = await this.arrayEquals(thisProperty, paramProperty, opts);
            } else {
                if (opts.compareFn) localEqual = opts.compareFn(property, thisProperty, paramProperty);
                else if (typeof thisProperty === 'string' || thisProperty instanceof String) {
                    let paramString = String(paramProperty), thisString = thisProperty;
                    if (opts.caseInsensitive) {
                        thisString = thisString.toLocaleUpperCase();
                        paramString = paramString.toLocaleUpperCase();
                    }
                    if (opts.stringContains) localEqual = thisString.indexOf(paramString) !== -1;
                    else localEqual = thisString === paramString;
                } else localEqual = thisProperty === paramProperty;
            }
            if (!localEqual) {
                localDifferences[property] = Object.keys(tempObj).length ? tempObj : { expected: paramProperty, actual: thisProperty };
                console.log(`Equals: ${property} was expected to be equals. Value 1: ${thisProperty}, Value 2: ${paramProperty}`);
            }
        }
        if (opts.differenceArray) for (let idx of Object.keys(localDifferences)) opts.differenceArray[idx] = localDifferences[idx];
        return !Object.keys(localDifferences).length;
    }
    /**
     * This method compares the current class with another IConstructor class, and returns whether they have the same values in the fields
     * @param {T} param The other parameter to compare to
     * @param {CompareOptions} opts The compare options
     * @returns {boolean} Indicates equality
     */
    @internal public async equals<T extends IConstructor>(param: T, opts: CompareOptions = { ignoreClass: false }): Promise<boolean> {
        return ((opts && opts.ignoreClass) || this.className.filter(el => param.className.findIndex(el2 => el2 === el) === -1).length === 0) &&
            await this._equals(param as any as this, opts);
    }
    @internal protected async oEquals<T extends IConstructor, U extends IConstructor>(tParam: T, pParam: U): Promise<boolean> {
        return (tParam === null && pParam === null) || (tParam === undefined && pParam === undefined) || (!!tParam && !!pParam && await tParam.equals(pParam));
    }
    @internal protected getAllProperties(obj: Object = this): string[] {
        return classExtensionProperties(obj).filter(el => el !== '_equals'); // Filter the abstract _equals
    }
    @internal protected sortProperties(propertyNames: string[] = this.getAllProperties()): string[] {
        return propertyNames.sort((a, b) => {
            let propertyA = this[generateName(FnNames.Order, a)], propertyB = this[generateName(FnNames.Order, b)];
            return (propertyB === undefined ? -1 : propertyB) - (propertyA === undefined ? -1 : propertyA);
        });
    }
    @internal protected uid: string = crypto.createHash('md5').update(Math.random().toString()).digest('hex');
}
