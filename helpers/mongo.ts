import { oh, TestConfig, assert } from 'framework/helpers';
import * as mongoose from 'mongoose';
import * as deasync from 'deasync';
import { IDataModelObject } from 'framework/object/core';

export enum NoticeType {
    error, warning, info
}

export enum Scope {
    all, issuer, investor
}

const NoticeSchema = {
    type: { type: String, enum: ['error', 'warning', 'info'] },
    scope: { type: String, enum: ['all', 'issuers', 'investors'] },
    title: String,
    content: String,
    isOneTime: Boolean,
    isValid: Boolean,
}

export class NoticeModel extends IDataModelObject {
    public type: NoticeType = oh.chance.pickOneEnum(NoticeType);
    public scope: Scope = Scope.all;
    public title: string = oh.chance.string({ length: 25 });
    public content: string = oh.chance.string({ length: 125 });
    public isOneTime: boolean = false;
    public isValid: boolean = true;
    public get mongo() {
        return {
            type: NoticeType[this.type],
            scope: Scope[this.scope],
            title: this.title,
            content: this.content,
            isOneTime: this.isOneTime,
            isValid: this.isValid
        }
    }
}


export class Mongo {
    private notice: mongoose.Model<mongoose.Document>;
    private connection: typeof mongoose;
    private static instance: Mongo;
    constructor() {
        if (Mongo.instance) {
            deasync(callback => Mongo.instance.connection.disconnect().then(() => callback(null)))();
            Mongo.instance = null;
        }
        Mongo.instance = this;
    }
    public async connect(): Promise<this> {
        let db = TestConfig.instance.protractorConfig.dbConfig;
        assert(db && db.mongo, `Can't initialize Mongo Connector with ${JSON.stringify(db)}`)
        this.connection = await mongoose.connect(db.mongo);
        this.notice = this.connection.model('Notice', new mongoose.Schema(NoticeSchema, { timestamps: true }));
        return this;
    }
    public async deleteAllNotices(): Promise<this> {
        if (!this.connection) await this.connect();
        await this.notice.deleteMany({});
        return this;
    }
    public async addNotice(opts: NoticeModel): Promise<mongoose.Document> {
        if (!this.connection) await this.connect();
        return await this.notice.create(opts.mongo);
    }
}