import { IssuerTest } from "../issuerTest";
import { binding, then, given } from "cucumber-tsflow/dist";
import { IssuerTestData } from "../issuerTestData";
import { NoticeType, Mongo } from "helpers/mongo";
import { expect, assert } from "framework/helpers";
import { CorePage } from "objects/pages/base";
import { Notice } from "objects/features/general/notice";

@binding([IssuerTestData])
export class NoticeTests extends IssuerTest {
    @given(/A notice is added/)
    public async addNotice() {
        this.data.notice = new Notice();
        let mng = new Mongo();
        await mng.deleteAllNotices()
        await mng.addNotice(this.data.notice);
    }

    @then(/A previously added notice is present/)
    public async noticePresent() {
        let page = await CorePage.Get<CorePage>(CorePage);
        await page.refresh('notice');
        expect(page.notice).not.to.be.null;
        let equals = await this.data.notice.equals(page.notice);
        expect(equals, `Notices are different`).to.be.true;
    }
}