import { After, HookScenarioResult, World, Status, setDefaultTimeout, Before } from 'cucumber';
import { oh } from 'framework/helpers';
import { Metamask, Network } from 'extensions/metamask';

process.on('uncaughtException', function (err) {
    console.error((err && err.stack) ? err.stack : err);
    debugger;
});

setDefaultTimeout(60 * 3600);

// TODO: Build nice reporting

let find = function (en: Object, name: string): string {
    for (let key of Object.keys(en)) if (isNaN(key as any) && key.toLowerCase().startsWith(name)) return key;
    return null;
}

Before(async function (this: World, scenario: HookScenarioResult) {
    // TODO: Make this browser independent
    // TODO: Implement automatic startup
    let secret = process.env.METAMASK_SECRET;
    if (!secret) throw `Missing metamask secret! You need to add the environment variable 'METAMASK_SECRET' for the tests to work`;
    await Metamask.instance.importAccount(secret);
    await Metamask.instance.switchNetwork(Network[find(Network, process.env.METAMASK_NETWORK)] || Network.Kovan);
    if (process.env.METAMASK_ACCOUNT_NUMBER)
        for (let i = 1; i < parseInt(process.env.METAMASK_ACCOUNT_NUMBER); ++i)
            await Metamask.instance.switchAccount();
    let info = await Metamask.instance.accountInfo();
    console.log(`INFO: Using '${info.name}' (${info.ethAddress}) with ${info.ethAmount} ETH`);
});

After(async function (this: World, scenario: HookScenarioResult) {
    if (scenario.result.status === Status.FAILED) {
        // Take screenshot and attach it to the test
        let base64 = await oh.browser.takeScreenshot();
        //this.attach(base64, 'image/png');
    }
    //await oh.restart();
});

