import { IDataModelObject } from "framework/object/core";
import { oh } from "framework/helpers";
import { EthAddress } from "models/ethGenerator";


class ComplianceItem {
    public ethAddress: string = EthAddress.Generate().address;
    public sellLockup: string = oh.chance.date({ american: true });
    public buyLockup: string = oh.chance.date({ american: true });
    public kyc: string = oh.chance.date({ american: true });
    public static toCSV(this: ComplianceItem): string {
        return `${this.ethAddress},${this.sellLockup},${this.buyLockup},${this.kyc}`;
    }
}

class MintItem extends ComplianceItem {
    public amount: number = oh.chance.natural();
    public static toCSV(this: MintItem): string {
        return `${ComplianceItem.toCSV.apply(this)},${this.amount}`;
    }
}

export class MintData extends IDataModelObject {
    public addresses: MintItem[] = oh.chance.n(() => new MintItem, oh.chance.natural({ min: 1 }));
    public static toCSV(this: MintData): string {
        return this.addresses.map(MintItem.toCSV).join('\n');
    }
}