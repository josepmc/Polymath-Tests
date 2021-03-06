import { IDataModelObject } from "framework/object/core";
import { oh } from "framework/helpers";
import { EthAddress } from "./ethGenerator";
import * as moment from 'moment';


export enum RaiseIn {
    Poly, Eth
}

const formatNumber = num => num < 10 ? `0${num}` : num;

export class CappedStoConfigModel extends IDataModelObject {
    // TODO: Fix this
    public startDate: string = oh.chance.date({ year: oh.chance.natural({ min: moment().year() + 1, max: 5000 }), american: true });
    public endDate: string = oh.chance.date({ year: oh.chance.natural({ min: moment(new Date(this.startDate)).year() + 1, max: 5001 }), american: true });
    public startTime: string = `${oh.chance.natural({ min: 1, max: 12 })}:${formatNumber(oh.chance.bool() ? 30 : 0)} ${oh.chance.bool() ? 'AM' : 'PM'}`;
    public endTime: string = `${oh.chance.natural({ min: 1, max: 12 })}:${formatNumber(oh.chance.bool() ? 30 : 0)} ${oh.chance.bool() ? 'AM' : 'PM'}`;
    public raiseIn: RaiseIn = oh.chance.pickOneEnum(RaiseIn);
    public hardCap: number = oh.chance.natural({ min: 1 });
    public rate: number = oh.chance.natural({ max: this.hardCap });
    public ethAddress: string = EthAddress.Generate().address;
    public static startNow(model: CappedStoConfigModel): CappedStoConfigModel {
        let currentDate = moment().add(12, 'm');
        // Minimum: +10 mins, we give 2 as margin
        model.startDate = currentDate.format('MM/DD/YYYY');
        model.startTime = currentDate.format('hh:mm');
        return model;
    }
}