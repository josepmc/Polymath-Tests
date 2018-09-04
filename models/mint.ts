import { IDataModelObject } from "framework/object/core";
import { oh, NumberRange, tmpFile } from "framework/helpers";
import { SharedComplianceItem } from "models/whitelistModel";
import * as csv from 'csvtojson';
import * as fs from 'fs';


class MintItem extends SharedComplianceItem {
    public amount: number;
    constructor(baseObject?: Object, nullable?: boolean) {
        super(baseObject, nullable);
        baseObject = baseObject || {};
        this.amount = parseFloat(baseObject['Minted']) || oh.chance.natural({ max: 200000 });
    }
    public toCSV(): string {
        return `${super.toCSV()},${this.amount}`;
    }
    public static async fromCsv(text: string | Object): Promise<MintItem> {
        return SharedComplianceItem.fromCsv.call(MintItem, text);
    }
}

export class MintData extends IDataModelObject {
    public addresses: MintItem[];
    public static async fromCsv(text: string): Promise<MintData> {
        let res = await csv().fromString(text);
        return new MintData({ addresses: await Promise.all(res.map(r => MintItem.fromCsv(r))) });
    }
    constructor(baseObject?: Object, nullable?: boolean, generateAmount: NumberRange = { minimum: 1, maximum: 10 }) {
        super(baseObject, nullable);
        if (!baseObject) {
            this.addresses = oh.chance.n(() => new MintItem(), oh.chance.natural({ min: generateAmount.minimum, max: generateAmount.maximum }));
        }
    }
    public toCSV(): string {
        return this.addresses.map(item => item.toCSV()).join('\n');
    }
    public toFile(): string {
        let file = tmpFile({ prefix: 'compliance-', postfix: '.csv' });
        fs.writeFileSync(file, this.toCSV());
        return file;
    }
}