import { Locator, By } from "framework/helpers";
import { nav, PageWithToken } from "objects/pages/withToken/base";


@nav(By.xpath('.//li[./p[text()="Token"]]')) export abstract class BaseToken extends PageWithToken {
    protected featureSelector: Locator = By.xpath('self::*[.//li[@class="active"][./p[text()="Token"]]]');
}