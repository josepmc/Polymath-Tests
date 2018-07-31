import { PuppeteerHandle } from 'framework/object/wrapper/puppeteer';
import { Arguments, argv as BaseArguments } from 'yargs';
import { RunnerConfig } from './definition';

class Environment {
    public argv: Arguments = BaseArguments;
    public config: RunnerConfig;
    constructor(private opts = {}) {
        this.argv = {
            ...this.argv,
            ...opts
        }
    }
}

const environments: { [k: string]: RunnerConfig } = {
    local: {
        baseUrl: 'http://localhost:3000',
        emailConfig: {
            user: process.env.GMAIL_USER,
            password: process.env.GMAIL_PASSWORD,
            host: "imap.gmail.com",
            port: 993,
            tls: true
        }
    }
}

export = (opts = {}) => {
    let currentEnv = new Environment(opts);

    currentEnv.config = {
        specs: [''],
        SELENIUM_PROMISE_MANAGER: false,
        disableChecks: true,
        noGlobals: true,
        restartBrowserBetweenTests: false,
        ignoreUncaughtExceptions: true,
        framework: 'custom',
        frameworkPath: require.resolve('protractor-cucumber-framework'),
        cucumberOpts: {
            //compiler: "ts:ts-node/register",
            require: [
                './config/cucumber-setup.ts',
                //'./framework/**/*.ts',
                //'./objects/**/*.ts',
                './tests/**/*.ts',
            ],
            tags: currentEnv.argv.tags || '',
            format: 'progress'
        },
        beforeLaunch: function () {
            require('./register');
        },
        params: {
            generatorSeed: currentEnv.argv.seed || Math.random(),
        },
        ...environments[currentEnv.argv.env || 'local']
    };
    let dapp;
    switch (currentEnv.argv.browser || 'dappeteer') {
        case 'puppeteer':
            dapp = false;
        case 'dappeteer':
            let pup = new PuppeteerHandle({ headless: false, useDapp: dapp === undefined ? true : false });
            currentEnv.config.capabilities = {
                browserName: 'chrome',
                chromeOptions: {
                    debuggerAddress: pup.address
                }
            }
            currentEnv.config.directConnect = true;
    }
    return currentEnv;
}