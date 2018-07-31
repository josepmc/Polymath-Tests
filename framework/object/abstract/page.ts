import { oh } from '../../helpers';
import { AbstractObject, AbstractObjectInitOpts } from './object';
import { internal } from '../core/shared';
import { IImplementable } from '../core/iImplementable';

export abstract class AbstractPage<I extends AbstractObjectInitOpts = AbstractObjectInitOpts> extends AbstractObject<I> {
  @internal public defaultPageUri: string;
  constructor(defaultPageUri?: string, element: IImplementable = null) { super(element); this.defaultPageUri = defaultPageUri; }

  @internal public async navigateToPage(uri?: string): Promise<this> {
    await oh.get(uri || this.defaultPageUri);
    return this;
  }
}