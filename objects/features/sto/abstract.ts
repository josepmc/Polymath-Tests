import { AbstractFeature } from "framework/object/abstract";
import { PageWithToken } from "objects/pages/withToken/base";

export abstract class StoConfig extends AbstractFeature { public abstract next(): Promise<PageWithToken>; }

export abstract class StoWidget extends AbstractFeature { }