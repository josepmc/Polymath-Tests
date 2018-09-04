import { TransactionalTest } from "../issuerTest";
import { binding, then, given } from "cucumber-tsflow/dist";
import { IssuerTestData } from "../issuerTestData";
import { Mongo, NoticeModel } from "helpers/mongo";
import { expect } from "framework/helpers";
import { IssuerPage } from "objects/pages/base";

@binding([IssuerTestData])
class NoticeTests extends TransactionalTest {
    private mongo: Mongo;
    @given(/A notice is added/)
    public async addNotice() {
        this.data.notice = new NoticeModel();
        this.mongo = new Mongo();
        await this.mongo.deleteAllNotices();
        await this.mongo.addNotice(this.data.notice);
    }

    @then(/A previously added notice is present/)
    public async noticePresent() {
        let page = await IssuerPage.Get<IssuerPage>(IssuerPage);
        await page.refresh('notice');
        expect(page.notice).not.to.be.null;
        let equals = await this.data.notice.equals(page.notice, { undefinedEqualsNotPresent: true, ignoreClass: true });
        expect(equals, `Notices are different`).to.be.true;
    }

    @then(/The notices added are cleaned up/)
    public async cleanNotices() {
        await this.mongo.deleteAllNotices();
    }
}

export =  NoticeTests;