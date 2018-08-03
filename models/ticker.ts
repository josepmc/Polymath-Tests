import { IDataModelObject } from "framework/object/core";
import { oh } from "framework/helpers";

export class TickerModel extends IDataModelObject {
    public symbol: string = `ZZ${oh.chance.string({ length: 8, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' })}`;
    public name: string = oh.chance.string();
}