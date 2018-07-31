import { IDataModelObject } from "framework/object/core";
import { oh } from "framework/helpers";

export class IssuerModel extends IDataModelObject {
    public fullName: string = `${oh.chance.first()} ${oh.chance.last()}`;
    public email: string = `status.test+${oh.chance.hash()}@polymath.network`;
    public marketingConsent: boolean = true;
    public termsOfUse: boolean = true;
}