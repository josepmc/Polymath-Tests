import { recurseClass } from '../core/shared';

export interface OldMethods<T> {
    oldMethods: T;
}

// Don't know if this is the best implementation possible
export function fillImplemented<T, U extends T & OldMethods<Object>>(thisObj: U, thatObj: T): T {
    if (thisObj.constructor === thatObj.constructor) return thatObj;
    let data: string[] = [];
    recurseClass(thisObj, rec => {
        if (rec.constructor === thatObj.constructor) return true;
        data = data.concat(Object.getOwnPropertyNames(rec).filter(el => !thatObj.hasOwnProperty(el) && data.indexOf(el) === -1));
        rec.constructor.toString().replace(/\n[ ]{4}(async)?\s?([_\w]+)\(.*\) {/g, (substring: string, ...args: any[]) => {
            if (data.indexOf(args[1]) === -1) data.push(args[1]);
            return args[1];
        });
        return false;
    });
    let oldMethods = {};
    for (let key of data) {
        // If you want to override these classes, somehow the function names need to be different or it'll get the ones from the parent
        // Save old methods
        let oldMethod = thatObj[key];
        if (typeof oldMethod === 'function') {
            oldMethods[key] = (...args) => {
                return (oldMethod as Function).apply(thatObj, args);
            };
        } else oldMethods[key] = oldMethod;
        // doesn't work for setters/getters
        let desc: PropertyDescriptor;
        recurseClass(thisObj, (obj, className) => {
            return !!(desc = Object.getOwnPropertyDescriptor(obj, key));
        });
        if (desc) {
            Object.defineProperty(thatObj, key, desc);
        } else thatObj[key] = thisObj[key];
    }
    (thatObj as U).oldMethods = oldMethods;
    return thatObj;
}
