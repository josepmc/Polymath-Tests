import 'reflect-metadata';
import tt = require('to-title-case');

export const internalKey: Symbol = Symbol('internalElement');
export function internal(target: Object, appliedProperty: string | symbol) {
    Reflect.defineMetadata(internalKey, true, target, appliedProperty);
}

export function isConstructor(value) {
    try {
        new new Proxy(value, { construct() { return {}; } });
        return true;
    } catch (err) {
        return false;
    }
}

export function getClassName(obj: Object): string {
    let funcNameRegex = /class\s+(\w+)\s+(extends\s*([^\s\{]+))?\s*\{/;
    let constructor = isConstructor(obj) ? obj : obj.constructor;
    let results = (funcNameRegex).exec(constructor.toString());
    if (results && results.length > 1) {
        return results.length === 4 && results[3] ? `${results[3]}.${results[1]}` : results[1];
    }
    return '';
}


export function recurseClass(target: Object, fn: ((obj: Object, className: string) => boolean | void)): void {
    let obj = target;
    let className: string;
    while (obj && (className = getClassName(obj))) {
        if (fn(obj, className) === true) return;
        obj = Object.getPrototypeOf(obj);
    }
}

export function classNameTree(target: Object): string[] {
    let classNames = [];
    recurseClass(target, (obj, className) => { classNames.push(className); });
    return classNames;
}

export function getAllProperties(obj: Object) {
    let res: string[] = [];
    for (let el in obj) res.push(el);
    let props = Object.getOwnPropertyNames(obj);
    return res.concat(props.filter(prop => res.findIndex(el1 => el1 === prop) === -1))
        .filter(prop => !Reflect.getMetadata(internalKey, obj, prop) && prop !== 'constructor');
}

export function classExtensionProperties(target: Object): string[] {
    let properties = [], finalProperties = [];
    recurseClass(target, (obj, className) => { properties = properties.concat(getAllProperties(obj)); });
    return [...new Set(properties)];
}

export enum FnNames {
    Get, Set, Order, Main,
}

export function generateName(name: FnNames, property: string | symbol) {
    switch (name) {
        case FnNames.Get: return `__${tt(property)}__get`;
        case FnNames.Set: return `__${tt(property)}__set`;
        case FnNames.Order: return `__${tt(property)}__order`;
        case FnNames.Main: return `__${tt(property)}__main`;
    }
}

export function isMetadataField(field: string): boolean {
    let strings = [];
    let regex = /^__(.*)__\w+$/.exec(field);
    if (!regex || regex.length < 2) return false;
    for (let enumValue in FnNames) {
        if (isNaN(parseInt(enumValue))) {
            if (generateName(parseInt(FnNames[enumValue]), regex[1])) return true;
        }
    }
    return false;
}