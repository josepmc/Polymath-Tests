import { Locator, By } from "framework/helpers";
import { injectable, inject } from "framework/object/core/iConstructor";
import { ProviderFeature } from "objects/features/providers/providerFeature";
import { nav, PageWithToken } from "objects/pages/withToken/base";

@injectable @nav(By.xpath('.//li[./p[text()="Providers"]]')) export class Providers extends PageWithToken {
    protected featureSelector: Locator = By.xpath('self::*[.//*[contains(@class, "providers-apply-modal")]]');
    @inject(ProviderFeature, { multiInstance: true }) public providers: ProviderFeature[];
}