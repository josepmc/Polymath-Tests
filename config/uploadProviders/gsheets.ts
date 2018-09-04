import { UploadProvider } from ".";
import { join } from "path";
import { readFileSync as readFile } from 'fs-extra';
import { assert } from "framework/helpers";
import gspread = require('google-spreadsheet');

interface GoogleSheetsOpts {
    email: string;
    token: string;
    sheet: string;
}

export class GoogleSheets extends UploadProvider {
    private spreadsheet: gspread;
    constructor(private opts: GoogleSheetsOpts) {
        super();
        assert(opts.email && opts.sheet && opts.token,
            `Google Sheets Upload provider can't be initialized - missing fields`);
        this.spreadsheet = new gspread(opts.sheet);
    }
    public async init(): Promise<void> {
        await new Promise<void>((r, e) => this.spreadsheet.useServiceAccountAuth
            ({ client_email: this.opts.email, private_key: this.opts.token },
            (err, res) => {
                if (err) e(err);
                else r(res);
            })
        );
    }
    public static providerKey: string = "GOOGLE_SHEETS";
    protected addTestValue(name: string, row: { [k: string]: string; }): Promise<void> {
        throw new Error("Method not implemented.");
    }
    protected async testsCompletedUpload(reportsDir: string): Promise<void> {
        // We will only upload the protractor configuration
        let parsed: {
            description: string;
            duration: number;
            assertions: {
                passed: boolean;
                stackTrace?: string;
                errorMsg?: string;
            }[]
        }[] = JSON.parse(readFile(join(reportsDir, 'protractor.json'), 'utf8'));
        console.log('Uploading results to Google Sheets...')
        for (let result of parsed) {
            let errorText = result.assertions.map(a => a.errorMsg).filter(a => a).join('\n');
            let stackTrace = result.assertions.map(a => a.stackTrace).filter(a => a).join('\n');
            let passed = result.assertions.every(a => a.passed);
            // TODO: Add automatic header creation using getRows + setCell
            await new Promise<void>((r, e) =>
                this.spreadsheet.addRow(1, {
                    // TODO: make prettier with cucumber stats
                    Name: result.description,
                    Duration: result.duration,
                    Status: passed ? 'Pass' : 'Fail',
                    'Error Message': errorText,
                    'Stacktrace': stackTrace
                }, (error, result) => {
                    if (error) e(error);
                    else r(result);
                })
            );
        }
        console.log(`Successfully uploaded the results, you can see them here: https://docs.google.com/spreadsheets/d/${this.opts.sheet}`);
    }
}

UploadProvider.Register(GoogleSheets, GoogleSheets.providerKey);