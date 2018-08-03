import { DataGenerator } from './abstract';
import { Chance } from 'chance';
import * as moment from 'moment/moment';
import { NumberRange } from '../../helpers';

export class ChanceGenerator extends DataGenerator {
    private chance: Chance.SeededChance;
    constructor(seed: number = null) {
        super(seed);
        this.chance = new Chance(this.seed);
        console.log(`Selected Seed: ${this.chance.seed}`);
    }

    public bool(opts?: Chance.Options) {
        return this.chance.bool(opts);
    }

    public string(opts?: Chance.Options) {
        if (!opts) opts = {};
        let length = opts.length || undefined;
        let str = "";
        if (length === 0) return str;
        // Avoid creating strings that start with a number
        if (!opts.skipFirst) {
            str += this.chance.string({
                pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()[]',
                length: 1
            });
            length--;
            if (!length) return str;
        }
        if (length) return str + this.chance.string({ ...opts, length: length - 1 });
        return str + this.chance.string(opts);
    }

    public first(opts?: Chance.Options) {
        return this.chance.first(opts);
    }

    public last(opts?: Chance.Options) {
        return this.chance.last(opts);
    }

    public prefix(opts?: Chance.Options) {
        return this.chance.prefix(opts);
    }

    public hash(opts?: Chance.Options) {
        return this.chance.hash(opts);
    }

    public n<T>(generator: (opts?: Chance.Options) => T, count: number, opts?: Chance.Options): T[] {
        let res = [];
        for (let i = 0; i < count; ++i) res.push(generator.apply(this, opts));
        return res;
    }

    public password(invalid?: boolean) {
        // TODO(@JG): Create method to generate invalid data object
        // Option to create invalid password (only length constrain)
        if (invalid) return this.chance.hash({ length: this.pickone([this.natural({ min: 0, max: 6 }), this.natural({ min: 51 })]) });
        return this.chance.hash({ length: this.natural({ min: 7, max: 50 }) });
    }

    public phone(opts?: Chance.Options) {
        return this.chance.phone(opts);
    }

    public email(opts?: Chance.Options) {
        return this.chance.email(opts);
    }

    public country() {
        // TODO(@jmc): Change this into using geonames
        return this.chance.pickone([this.countryList.Sweden, this.countryList.Belgium]);
    }

    public extCountry(opts?: Chance.Options) {
        return this.chance.country(opts);
    }

    public street(opts?: Chance.Options) {
        return this.chance.street(opts);
    }

    public natural(opts?: Chance.Options) {
        return this.chance.natural(opts);
    }

    public date(opts?: Chance.DateOptions) {
        return moment(this.chance.date(opts)).format(opts && opts.american ? 'MM/DD/YYYY' : 'DD/MM/YYYY');
    }

    public pickone<T>(arr: T[]) {
        return this.chance.pickone(arr);
    }

    public pickMultiple(enumType): number {
        let res = 0, array = this.enumToArray(enumType);
        for (let el of this.chance.pickset(array, this.chance.natural({ max: array.length }))) res |= el;
        return res;
    }

    public pickOneEnum(enumType, optional: boolean = false, except?: number[]): number {
        return optional && this.chance.bool() ? undefined : this.chance.pickone(this.enumToArray(enumType, false, except));
    }

    public naturalOrNone(opts?: Chance.Options): number {
        return this.chance.bool() ? this.chance.natural(opts) : undefined;
    }

    public rangeOrNone(opts: Chance.Options = {}): NumberRange {
        let firstVal = this.chance.natural({
            min: opts.min, max: opts.max ? this.chance.natural({ min: opts.min, max: opts.max }) : undefined,
        });
        return this.chance.bool() ? {
            minimum: firstVal, maximum: this.chance.natural({ min: firstVal + 1, max: opts.max }),
        } : undefined;
    }

    public range(opts: Chance.Options = {}): NumberRange {
        let firstVal = this.chance.natural({ min: opts.min, max: opts.max - 2 });
        return {
            minimum: firstVal,
            maximum: this.chance.natural({ min: firstVal + 1, max: opts.max }),
        };
    }

    public stringOrNone(opts?: Chance.Options): string {
        return this.chance.bool() ? this.chance.string(opts) : '';
    }

    public integer(opts?: Chance.Options): number {
        return this.chance.integer(opts);
    }
}
