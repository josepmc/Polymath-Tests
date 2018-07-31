import { AbstractFeature } from "framework/object/abstract";
import { Locator, oh, By } from "framework/helpers";
import { PageWithHeader } from "objects/pages/base";

type Children<T extends PageWithToken = PageWithToken> = {
    locator: Locator;
    type: Function & { prototype: T };
}

const registeredPages: { [k: string]: Children } = {};
export function nav<T extends PageWithToken>(navigationKey: Locator) {
    return function (cl: Function & { prototype: T }) {
        let key = cl.toString();
        if (registeredPages[key]) {
            throw `Class ${key} is already registered`
        }
        registeredPages[key] = { locator: navigationKey, type: cl };
    }
}

// Sadly this is a circular dependency
export class NavigationFeature extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[class="pui-sidebar"]');
    public async navigate<T extends PageWithToken>(toClass: { new(...args): T }): Promise<T> {
        let newPage = Object.values(registeredPages).find(el => el.type === toClass);
        if (!newPage) throw `Page ${toClass.name} not found`;
        return oh.click(this.element, newPage.locator).then(() => PageWithToken.Get(newPage.type) as Promise<T>);
    }
    public async current<T extends PageWithToken>(): Promise<T> {
        for (let el of Object.values(registeredPages)) {
            if (oh.present(By.xpath('self::*[@class="active"]'), await oh.by(this.element, el.locator)))
                return PageWithToken.Get(el.type) as Promise<T>;
        }
        return null;
    }
}

// TODO: Prettify this PO
export abstract class PageWithToken extends PageWithHeader {
    protected featureSelector: Locator = By.xpath('.//*[@id="root"]');
    public navigation: NavigationFeature = new NavigationFeature();
}