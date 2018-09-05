import { After, HookScenarioResult, World, Status, setDefaultTimeout, Before } from 'cucumber';
import { oh, WindowInfo, By } from 'framework/helpers';
import { Metamask, Network } from 'extensions/metamask';
const debugMode = process.env.IS_DEBUG;

process.on('uncaughtException', function (err) {
    console.error((err && err.stack) ? err.stack : err);
    debugger;
});

// For process.exit file removal, when having a lot of files
require('events').EventEmitter.defaultMaxListeners = 100;

setDefaultTimeout(debugMode ? 60 * 60 * 1000 : 5 * 60 * 1000);

// TODO: Build nice reporting

let find = function (en: Object, name: string): string {
    for (let key of Object.keys(en)) if (isNaN(key as any) && key.toLowerCase().startsWith(name)) return key;
    return null;
}

let first = true;
Before({ timeout: debugMode ? 60 * 60 * 1000 : 5 * 60 * 1000 }, async function (this: World, scenario: HookScenarioResult) {
    // TODO: Make this browser independent
    // TODO: Implement automatic startup
    if (first) first = false;
    else await oh.restart();
    await oh.browser.maximize();
    let secret = process.env.METAMASK_SECRET;
    if (!secret) throw `Missing metamask secret! You need to add the environment variable 'METAMASK_SECRET' for the tests to work`;
    console.log('DEBUG: Importing metamask account');
    await Metamask.instance.importAccount(secret);
    console.log('DEBUG: Switching network');
    await Metamask.instance.switchNetwork(Network[find(Network, process.env.METAMASK_NETWORK)] || Network.Kovan);
    console.log('DEBUG: Switching account');
    if (process.env.METAMASK_ACCOUNT_NUMBER)
        for (let i = 1; i < parseInt(process.env.METAMASK_ACCOUNT_NUMBER); ++i)
            await Metamask.instance.switchAccount();
    let info = await Metamask.instance.accountInfo();
    console.log(`INFO: Using '${info.name}' (${info.ethAddress}) with ${info.ethAmount} ETH`);
    console.log('DEBUG: Closing extra windows');
    let def = await oh.browser.defaultFrame(true);
    let all = await oh.browser.getAllWindowHandles();
    let handles = all.filter(h => def.windowHandle != h);
    if (all.length == handles.length) handles = handles.splice(0, 1);
    for (let h of handles) {
        try {
            await oh.browser.switchToFrame(new WindowInfo(h, [null]));
            await oh.browser.window().close();
        } catch (error) {
            debugger;
        }
    }
});

After(async function (this: World, scenario: HookScenarioResult) {
    if (scenario.result.status === Status.FAILED) {
        // Take screenshot and attach it to the test
        switch (process.env.FAIL_LOG || 'image') {
            case 'image':
                try {
                    let base64 = await oh.browser.takeScreenshot();
                    await this.attach(base64, 'image/png');
                    let def = await oh.browser.currentFrame();
                    let all = await oh.browser.getAllWindowHandles();
                    let handles = all.filter(h => def.windowHandle != h);
                    if (all.length == handles.length) handles = handles.splice(0, 1);
                    for (let h of handles) {
                        try {
                            await oh.browser.switchToFrame(new WindowInfo(h, [null]));
                            let base64 = await oh.browser.takeScreenshot();
                            await this.attach(base64, 'image/png');
                        } catch (error) {
                            console.log(`Error attach: Can't take secondary screenshot. Error: ${JSON.stringify(error)})`)
                        }
                    }
                    break;
                }
                catch (error) {
                    console.error(`Error attach: Can't take screenshot. Error: ${JSON.stringify(error)})`);
                }
            case 'console':
                console.log(await oh.browser.getPageSource());
                break;
        }
    }
    // If we restart here we risk a node instakill
});

