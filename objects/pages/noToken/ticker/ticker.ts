import { Locator } from "framework/helpers";
import { By } from "selenium-webdriver";
import { injectable } from "framework/object/core/iConstructor";
import { TickerFeature } from "objects/features/ticker/ticker";
import { PageWithHeader } from "objects/pages/base";

@injectable export class Ticker extends PageWithHeader {
    protected featureSelector: Locator = By.xpath('.//body[.//*[@name="ticker"]]');
    public ticker: TickerFeature = new TickerFeature(this);
}