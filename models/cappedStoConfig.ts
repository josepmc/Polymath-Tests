import { IDataModelObject } from "framework/object/core";
import { oh } from "framework/helpers";
import { EthAddress } from "./ethGenerator";
import * as moment from 'moment';

export enum AmPm {
    AM, PM
}

export enum RaiseIn {
    Poly, Eth
}

export class CappedStoConfigModel extends IDataModelObject {
    // TODO: Fix this
    public startDate: string = oh.chance.date({ year: oh.chance.natural({ min: moment().year() + 1 }), american: true });
    public endDate: string = oh.chance.date({ year: oh.chance.natural({ min: moment(this.startDate).year() + 1 }), american: true });
    public startTime: string = `${oh.chance.natural({ min: 1, max: 12 })}:${oh.chance.natural({ max: 59 })}`;
    public startTimeAmPm: AmPm = oh.chance.pickOneEnum(AmPm);
    public endTime: string = `${oh.chance.natural({ min: 1, max: 12 })}:${oh.chance.natural({ max: 59 })}`;
    public endTimeAmPm: AmPm = oh.chance.pickOneEnum(AmPm);
    public raiseIn: RaiseIn = oh.chance.pickOneEnum(RaiseIn);
    public hardCap: number = oh.chance.natural({ min: 1 });
    public rate: number = oh.chance.natural({ max: this.hardCap });
    public ethAddress: string = EthAddress.Generate().address;
}