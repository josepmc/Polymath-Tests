import { IDataModelObject } from "framework/object/core";
import { oh, TestConfig } from "framework/helpers";

export class IssuerModel extends IDataModelObject {
    public fullName: string = `${oh.chance.first()} ${oh.chance.last()}`;
    public email: string;
    public marketingConsent: boolean = true;
    public termsOfUse: boolean = true;
    constructor(baseObject?: Object, nullable?: boolean) {
        super(baseObject, nullable);
        let email = /(.*)@(.*)/.exec(TestConfig.instance.protractorConfig.emailConfig.user);
        if (!email || email.length != 3) throw `Invalid base email address ${TestConfig.instance.protractorConfig.emailConfig.user}, can't create a dynamic one`;
        this.email = `${email[1]}+${oh.chance.hash()}@${email[2]}`;
    }
}