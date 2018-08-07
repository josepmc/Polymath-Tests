import { IDataModelObject } from "framework/object/core";
import { oh, assert } from "framework/helpers";
import { EthAddress } from "models/ethGenerator";
import * as csv from 'csvtojson';
import * as tmp from 'tmp';
import * as fs from 'fs';


export class ComplianceItem extends IDataModelObject {
    public ethAddress: string;
    public sellLockup: string;
    public buyLockup: string;
    public kyc: string;
    constructor(baseObject?: Object, nullable?: boolean) {
        super({}, nullable);
        baseObject = baseObject || {};
        // TODO: Make this prettier and with a decorator
        this.ethAddress = baseObject['Address'] || EthAddress.Generate().address;
        this.sellLockup = baseObject['Sale Lockup'] || oh.chance.date({ american: true });
        this.buyLockup = baseObject['Purchase Lockup'] || oh.chance.date({ american: true });
        this.kyc = baseObject['KYC/AML Expiry'] || oh.chance.date({ american: true });
    }
    public toCSV(): string {
        return `${this.ethAddress},${this.sellLockup},${this.buyLockup},${this.kyc}`;
    }
    public static async fromCsv(this: { new(...args): ComplianceItem }, text: string | Object): Promise<ComplianceItem> {
        if (text instanceof Object) return new this(text);
        let result = await csv().fromString(text);
        assert(result.length === 1, `ComplianceItem - Couldn't parse CSV ${text}`);
        return new this(result[0]);
    }
}

export class ComplianceData extends IDataModelObject {
    public addresses: ComplianceItem[];
    public static async fromCsv(text: string): Promise<ComplianceData> {
        let res = await csv().fromString(text);
        return new ComplianceData({ addresses: await Promise.all(res.map(r => ComplianceItem.fromCsv(r))) });
    }
    constructor(baseObject?: Object, nullable?: boolean) {
        super(baseObject, nullable);
        if (!baseObject) {
            this.addresses = oh.chance.n(() => new ComplianceItem(), oh.chance.natural({ min: 1, max: 10 }));
        }
    }
    public toCSV(): string {
        return this.addresses.map(item => item.toCSV()).join('\n');
    }
    public toFile(): string {
        let file = tmp.fileSync({ prefix: 'compliance-', postfix: '.csv' });
        fs.writeFileSync(file.fd, this.toCSV());
        return file.name;
    }
}

export class WhitelistModel extends IDataModelObject {
    public enableOwnershipPermissions: boolean = true;//oh.chance.bool();
    public maxOwnership?: number = oh.chance.natural({ min: 1, max: 100 });
    public data: ComplianceData = new ComplianceData();
}