import { ImapSimpleOptions, ImapSimple, connect } from 'imap-simple';
import { FetchOptions, Config } from 'imap';
import * as deasync from 'deasync';

export class EmailHandler {
    private connection: ImapSimple;
    constructor(protected opts: Config) {
        let self = this;
        deasync(async () => {
            self.connection = await connect({ imap: this.opts });
        })();
    }
    public async fetchTo(to: string): Promise<string[]> {
        let searchCriteria = [
            'UNSEEN', 'TO', to
        ];
        let fetchOptions: FetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: true
        };
        let results = await this.connection.search(searchCriteria, fetchOptions);
        debugger; // TODO: Debug this
        let messages = results.map(function (res) {
            return res.parts.filter(function (part) {
                return part.which === 'HEADER';
            })[0].body.subject[0];
        });
        return messages;
    }
}