import { IDataModelObject } from "framework/object/core";
import { oh } from "framework/helpers";

export class TickerModel extends IDataModelObject {
    public symbol: string = `ATEST-${Date.now()}`;
    public name: string = oh.chance.string();
}