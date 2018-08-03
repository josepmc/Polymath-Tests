import { AbstractPage } from "framework/object/abstract";
import { Header } from "objects/features/general/header";

export abstract class CorePage extends AbstractPage { }

export abstract class PageWithHeader extends CorePage {
    public header: Header = new Header(this);
}