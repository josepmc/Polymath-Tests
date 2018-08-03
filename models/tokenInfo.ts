import { IDataModelObject } from "framework/object/core";
import { oh } from "framework/helpers";

export enum DivisibleIndivisible {
    Divisble, Indivisible
}

export class TokenInfoModel extends IDataModelObject {
    public tokenDivisibility: DivisibleIndivisible = oh.chance.pickOneEnum(DivisibleIndivisible);
    public allowMaxInvestors: boolean = true;
    public maxInvestors?: number = oh.chance.natural({ max: 99 });
    // TODO: Fix this
    public additionalTokenInformation: string = 'https://' + oh.chance.string({ skipFirst: true, pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@.' }) + '.com';
}