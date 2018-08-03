import { AbstractFeature } from "framework/object/abstract";
import { Locator, oh, By } from "framework/helpers";
import { PageWithHeader } from "objects/pages/base";
import { recurseClass } from "framework/object/core/shared";

type Children<T extends PageWithToken = PageWithToken> = {
    locator: Locator;
    type: Function & { prototype: T };
}

const register: Symbol = Symbol('registered');
export function nav<T extends PageWithToken>(navigationKey: Locator) {
    return function (cl: Function & { prototype: T }) {
        Reflect.defineMetadata(register, navigationKey, cl);
    }
}

// Sadly this is a circular dependency
export class NavigationFeature extends AbstractFeature {
    protected featureSelector: Locator = By.xpath('.//*[@class="pui-sidebar"]');
    public async navigate<T extends PageWithToken>(toClass: { new(...args): T }): Promise<T> {
        let key: Locator;
        recurseClass(toClass, obj => {
            key = Reflect.getMetadata(register, obj);
            return !!key;
        });
        if (!key) throw `Page ${toClass.name} not found`;
        return oh.click(key, this.element).then(() => new toClass().load());
    }
}

// TODO: Prettify this PO
export abstract class PageWithToken extends PageWithHeader {
    protected featureSelector: Locator = By.xpath('.//*[@id="root"]');
    public navigation: NavigationFeature = new NavigationFeature();
}