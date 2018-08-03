import { ImapSimple, connect } from 'imap-simple';
import * as deasync from 'deasync';
import { Config, FetchOptions } from 'imap';
import { simpleParser } from 'mailparser';


export class EmailHandler {
    private connection: ImapSimple;
    constructor(protected opts: Config) {
        deasync(async callback => {
            this.connection = await connect({ imap: this.opts });
            await this.connection.openBox('INBOX');
            callback(null);
        })();
    }
    public async fetchTo(to: string): Promise<string[]> {
        let searchCriteria = [
            'UNSEEN', ['TO', to]
        ];
        let fetchOptions: FetchOptions = {
            bodies: [''],
            markSeen: true
        };
        let results = await this.connection.search(searchCriteria, fetchOptions);
        let messages: string[] = [];
        for (let message of results) {
            let part = message.parts.find(part => part.which === '');
            if (!part) console.log(`Error finding content for message ${JSON.stringify(part)}`);
            let parsed = await simpleParser(part.body);
            messages.push((parsed.html as string) || parsed.textAsHtml)
        }
        return messages;
    }
}