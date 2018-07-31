import { AbstractFeature, optional } from "framework/object/abstract";
import { Locator, By } from "framework/helpers";
import { label } from "framework/object/core/decorators";

export class Header extends AbstractFeature {
    public featureSelector: Locator = By.xpath('.//*[@]');
    @label<string>(By.xpath('.//li[.//*[@alt="Active network"]]')) public network: string;
    @label<number>(By.xpath('.//li[.//*[@alt="Your POLY balance"]]'), /(\d+)/) public poly: number;
    @label<string>(By.xpath('.//li[.//*[@alt="Account"]]')) public ethAddress: string;
    @optional @label<string>(By.xpath('.//li[.//*[@alt="Token"]]')) public token: string;
}