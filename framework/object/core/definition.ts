import { assert } from '../../helpers';

export const optionalSymbol: Symbol = Symbol('optional');

export function optional(target: Object, key: string) {
    let opt: boolean = Reflect.getMetadata(optionalSymbol, target.constructor, key);
    assert(!opt, `Metadata - Optional: Key is repeated: ${key}`);
    Reflect.defineMetadata(optionalSymbol, true, target.constructor, key);
}
