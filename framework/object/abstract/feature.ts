import { oh } from '../../helpers';
import { AbstractObject, AbstractObjectInitOpts } from './object';
import { InitMode } from '../core/iConstructor';

export abstract class AbstractFeature extends AbstractObject {
    public async afterInit(result: this, opts: AbstractObjectInitOpts): Promise<void> {
        if (result && opts.mode === InitMode.Full) await oh.scrollTo(this.element);
    }
}
