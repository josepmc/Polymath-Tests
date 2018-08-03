import { Locator, By } from "framework/helpers";
import { injectable } from "framework/object/core/iConstructor";
import { nav, PageWithToken } from "objects/pages/withToken/base";
import { WhitelistFeature } from "objects/features/whitelist/whitelist";

@injectable @nav(By.xpath('.//li[./p[text()="Compliance"]]')) export class Whitelist extends PageWithToken {
    protected featureSelector: Locator = By.xpath('self::*[.//li[@class="active"][./p[text()="Compliance"]]]');
    public whitelist: WhitelistFeature = new WhitelistFeature(this);
}