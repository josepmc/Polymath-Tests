import { AbstractFeature } from "framework/object/abstract";
import { Modal } from "objects/features/general/modal";

export abstract class StoConfig extends AbstractFeature { public abstract next(): Promise<Modal>; }

export abstract class StoWidget extends AbstractFeature { }