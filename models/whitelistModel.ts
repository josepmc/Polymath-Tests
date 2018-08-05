import { IDataModelObject } from "framework/object/core";
import { oh } from "framework/helpers";


export class WhitelistModel extends IDataModelObject {
    public enableOwnershipPermissions: boolean = true;//oh.chance.bool();
    public maxOwnership?: number = oh.chance.natural({ min: 1, max: 100 });
}