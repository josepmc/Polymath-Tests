import { AbstractFeature } from "framework/object/abstract";
import { Locator, By } from "framework/helpers";


export class CountdownFeature extends AbstractFeature {
    public featureSelector: Locator = By.xpath('.//*[@class="pui-countdown-time"]');
}