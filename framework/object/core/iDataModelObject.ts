import { optionalSymbol } from './definition';
import * as extend from 'extend';
import { isMetadataField } from './shared';
import { IConstructor, propertyDescriptor, CompareOptions } from './iConstructor';
import { oh } from '../../helpers';

export abstract class IDataModelObject extends IConstructor {
    constructor(baseObject?: Object, nullable: boolean = false) {
        super();
        if (nullable && oh.chance.bool()) return undefined;
        return baseObject ? (extend(false, this, baseObject) as this) : this;
    }
    public async optionalMandatoryFields(): Promise<{ optional: string[], mandatory: string[] }> {
        let optional = [];
        let mandatory = [];
        for (let property of this.getAllProperties()) {
            if (isMetadataField(property)) continue;
            let descriptor = propertyDescriptor(this, property);
            if (descriptor.value instanceof IDataModelObject) {
                let res = await (this[property] as IDataModelObject).optionalMandatoryFields();
                if (res && res.mandatory.length) mandatory.push(property);
                else if (res && res.optional.length && !res.mandatory.length) optional.push(property);
                continue;
            }
            let metadata = Reflect.getMetadata(optionalSymbol, this.constructor, property);
            if (metadata) {
                optional.push(property);
            } else mandatory.push(property);
        }
        return { optional: optional, mandatory: mandatory };
    }
    public async _equals<T extends IConstructor>(param: T, opts: CompareOptions): Promise<boolean> {
        if (opts.ignoreMetadata === undefined) opts.ignoreMetadata = true;
        return super._equals(param, opts);
    }
}
