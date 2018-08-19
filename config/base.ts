import { PuppeteerHandle } from 'framework/object/wrapper/puppeteer';
import { Arguments, argv as BaseArguments } from 'yargs';
import { RunnerConfig } from './definition';
import { ExtensionManager, ExtensionBrowser, ExtensionData, ExtensionInfo, ExtensionConfig } from 'extensions';
import * as deasync from 'deasync';
import { readFileSync } from 'fs';
import { LocalDownloadManager } from './download/local';
import { assert } from 'framework/helpers';
import { CloudDownloadManager } from 'config/download/cloud';
import cbt = require('cbt_tunnels');
let localhost = 'localhost';
const debugMode = process.env.IS_DEBUG;

process.on('uncaughtException', function (err) {
    console.error((err && err.stack) ? err.stack : err);
    debugger;
});

class Environment {
    public argv: Arguments = BaseArguments;
    public config: RunnerConfig;
    constructor(private opts = { params: {} }) {
        this.argv = {
            ...opts,
            ...this.argv,
            params: {
                ...(opts && opts.params),
                ...(this.argv && this.argv).params
            },
        }
    }
}
const environments = function (): { [k: string]: RunnerConfig } {
    return {
        local: {
            baseUrl: `http://${localhost}:3000`,
            emailConfig: {
                user: process.env.GMAIL_USER,
                password: process.env.GMAIL_PASSWORD,
                host: "imap.gmail.com",
                port: 993,
                tls: true
            }
        },
        production: {
            baseUrl: 'https://tokenstudio.polymath.network',
            emailConfig: {
                user: process.env.GMAIL_USER,
                password: process.env.GMAIL_PASSWORD,
                host: "imap.gmail.com",
                port: 993,
                tls: true
            }
        }
    }
}

let shutdownFns: (() => Promise<void> | void)[] = [];
const getExtensions = function (env: string[], browser: ExtensionBrowser): { info: ExtensionInfo, data: ExtensionData, config: ExtensionConfig }[] {
    let res: { info: ExtensionInfo, data: ExtensionData, config: ExtensionConfig }[] = []
    if (env) {
        if (!(env instanceof Array)) env = [env];
        res = [];
        let extensions = ExtensionManager.GetExtensions(browser);
        for (let ex of env) {
            let install = extensions.find(e => e.name.toLowerCase() === ex.toLowerCase());
            if (!install) throw `Couldn't find ${ex} for ${ExtensionBrowser[browser]}`;
            console.log(`Loading ${install.name} for ${ExtensionBrowser[browser]}`);
            let extension = new install.extension();
            let data: ExtensionData = deasync(cb => extension.getExtension(browser).then(res => cb(null, res)))();
            if (!data) {
                console.warn(`No extension '${install.name}' installed for ${ExtensionBrowser[browser]}`);
                continue;
            }
            console.log(`Loaded ${install.name} for ${ExtensionBrowser[browser]}`);
            res.push({ info: install, data: data, config: extension.getConfig() });
            if (data.afterExecution) shutdownFns.push(data.afterExecution);
        }
    }
    return res;
}

export = (opts = { params: {} }) => {
    try {
        let currentEnv = new Environment(opts);
        currentEnv.config = {
            allScriptsTimeout: debugMode ? 60 * 60 * 1000 : 2 * 60 * 1000,
            specs: ['tests/**/*.feature'],
            SELENIUM_PROMISE_MANAGER: false,
            disableChecks: true,
            noGlobals: true,
            restartBrowserBetweenTests: false,
            ignoreUncaughtExceptions: true,
            framework: 'custom',
            frameworkPath: require.resolve('protractor-cucumber-framework'),
            localhost: localhost,
            cucumberOpts: {
                //compiler: "ts:ts-node/register",
                require: [
                    './config/cucumber-setup.ts',
                    //'./framework/**/*.ts',
                    './extensions/**/*.ts',
                    './objects/**/*.ts',
                    './tests/**/*.ts',
                ],
                tags: currentEnv.argv.params.tags || '',
                format: 'node_modules/cucumber-pretty'
            },
            extensions: {
            },
            beforeLaunch: function () {
                require('./register');
            },
            afterLaunch: async function () {
                for (let fn of shutdownFns) await fn();
            },
            params: {
                ...currentEnv.argv.params,
                generatorSeed: currentEnv.argv.seed || (Math.random() * Number.MAX_SAFE_INTEGER),
            },
            ...environments()[currentEnv.argv.env || 'local']
        };
        switch ((currentEnv.argv.params.browser && currentEnv.argv.params.browser.toLowerCase()) || 'puppeteer') {
            case 'puppeteer': {
                let extensions = getExtensions(currentEnv.argv.params.extensions, ExtensionBrowser.Chrome);
                let dlmgr = new LocalDownloadManager();
                let pup = new PuppeteerHandle({
                    // We can't run chrome in headless when using extensions
                    headless: false,
                    // If we're using command line flags, we can only pass uncompressed directories
                    extensions: extensions.map(ex => ex.data.uncompressed),
                    downloadManager: dlmgr,
                });
                let ext = {};
                for (let ex of extensions) ext[ex.config.key] = ex.config.config;
                currentEnv.config.capabilities = {
                    directConnect: true,
                    extraConfig: {
                        extensions: ext,
                        downloadManager: dlmgr.getConfig(),
                    },
                    browserName: 'chrome',
                    chromeOptions: {
                        debuggerAddress: pup.address
                    }
                }
                break;
            }
            case 'chrome': {
                let extensions = getExtensions(currentEnv.argv.params.extensions, ExtensionBrowser.Chrome);
                let dlmgr = new LocalDownloadManager();
                let ext = {};
                for (let ex of extensions) ext[ex.config.key] = ex.config.config;
                currentEnv.config.capabilities = {
                    directConnect: true,
                    extraConfig: {
                        extensions: ext,
                        downloadManager: dlmgr.getConfig(),
                    },
                    browserName: 'chrome',
                    chromeOptions: {
                        // Webdriver requires .crx files
                        extensions: extensions
                            .map(ex => readFileSync(ex.data.file, 'base64')),
                    },
                    prefs: {
                        "profile.default_content_settings.cookies": 0,
                        'download': {
                            'prompt_for_download': false,
                            'default_directory': dlmgr.downloadPath(),
                            'directory_upgrade': true
                        }
                    }
                }
                break;
            }
            case 'chromium': {
                let extensions = getExtensions(currentEnv.argv.params.extensions, ExtensionBrowser.Chrome);
                let dlmgr = new LocalDownloadManager();
                let ext = {};
                for (let ex of extensions) ext[ex.config.key] = ex.config.config;
                currentEnv.config.capabilities = {
                    directConnect: true,
                    extraConfig: {
                        extensions: ext,
                        downloadManager: dlmgr.getConfig(),
                    },
                    browserName: 'chrome',
                    chromeOptions: {
                        binary: PuppeteerHandle.bundledPath,
                        extensions:
                            extensions.map(ex => readFileSync(ex.data.file, 'base64'))
                    },
                    prefs: {
                        "profile.default_content_settings.cookies": 0,
                        'download': {
                            'prompt_for_download': false,
                            'default_directory': dlmgr.downloadPath(),
                            'directory_upgrade': true
                        }
                    }
                }
                break;
            }
            case 'firefox': {
                let dlmgr = new LocalDownloadManager()
                currentEnv.config.capabilities = {
                    directConnect: true,
                    extraConfig: {
                        downloadManager: dlmgr.getConfig(),
                    },
                    browserName: 'firefox',
                    //TODO: Use get-firefox to download a local copy
                    //TODO: Implement metamask support
                }
                break;
            }
            case 'edge': {
                let dlmgr = new LocalDownloadManager()
                currentEnv.config.capabilities = {
                    directConnect: true,
                    extraConfig: {
                        downloadManager: dlmgr.getConfig(),
                    },
                    browserName: 'edge',
                    //TODO: Implement metamask support
                }
                break;
            }
            case 'safari': {
                let dlmgr = new LocalDownloadManager()
                currentEnv.config.capabilities = {
                    directConnect: true,
                    extraConfig: {
                        downloadManager: dlmgr.getConfig(),
                    },
                    browserName: 'safari',
                    //TODO: Implement metamask support
                }
                break;
            }
            case 'cloud': {
                assert(process.env.CBT_USER, `Crossbrowsertesting user is not defined`);
                assert(process.env.CBT_KEY, `Crossbrowsertesting key is not defined`);
                /*let input = ['win,10,chrome,65'];
                if (currentEnv.argv.params.bsbrowser) {
                    if (currentEnv.argv.params.bsbrowser instanceof Array) {
                        input = currentEnv.argv.params.bsbrowser;
                    }
                    else input = (currentEnv.argv.params.bsbrowser as string).split(';');
                }
                let browsers = input.map(b => {
                    let components = b.split(',');
                    return {
                        os: components[0], os_version: components[1],
                        browser: components[2], browser_version: components[3]
                    };
                });*/
                // In crossbrowsertesting, our 'localhost' is 'local'
                localhost = 'local';
                let extensions = getExtensions(currentEnv.argv.params.extensions, ExtensionBrowser.Chrome);
                let dlmgr = new CloudDownloadManager();
                let ext = {};
                for (let ex of extensions) ext[ex.config.key] = ex.config.config;
                let oldBefore = currentEnv.config.beforeLaunch;
                let oldAfter = currentEnv.config.afterLaunch;
                currentEnv.config = {
                    ...currentEnv.config,
                    // Add again the environments as localhost changed
                    ...environments()[currentEnv.argv.env || 'local'],
                    localhost: localhost,
                    beforeLaunch: function () {
                        oldBefore();
                        deasync(callback => cbt.start({
                            "username": process.env.CBT_USER,
                            "authkey": process.env.CBT_KEY
                        }, callback))();
                    },
                    afterLaunch: async function (exitCode: number) {
                        await oldAfter(exitCode);
                        await cbt.stop();
                    },
                    seleniumAddress: `http://${process.env.CBT_USER}:${process.env.CBT_KEY}@hub.crossbrowsertesting.com/wd/hub`,
                    extraConfig: {
                        downloadManager: dlmgr.getConfig(),
                        extensions: ext
                    },
                    capabilities: {
                        browserName: 'chrome',
                        platform: 'Windows 10',
                        version: '68.0',
                        record_video: true,
                        chromeOptions: {
                            extensions: extensions.map(ex => readFileSync(ex.data.file, 'base64')),
                        },
                    }
                }
                break;
            }
        }
        return currentEnv;
    } catch (error) {
        console.error(error);
        debugger;
        throw error;
    }
}

