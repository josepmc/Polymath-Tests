import { IDataModelObject } from "framework/object/core";

export enum DivisibleIndivisible {
    Divisble, Indivisible
}

export class TokenInfoModel extends IDataModelObject {
    public tokenDivisibility: DivisibleIndivisible;
    public allowMaxInvestors: boolean;
    public maxInvestors?: number;
    public additionalTokenInformation: string;
}