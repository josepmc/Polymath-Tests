import { After, HookScenarioResult, World, Status, setDefaultTimeout, Before } from 'cucumber';
import { oh } from 'framework/helpers';
import { Metamask, Network } from 'extensions/metamask';

process.on('uncaughtException', function (err) {
    console.error((err && err.stack) ? err.stack : err);
    debugger;
});

setDefaultTimeout(60 * 3600);

// TODO: Build nice reporting

Before(async function (this: World, scenario: HookScenarioResult) {
    // TODO: Make this browser independent
    let secret = process.env.METAMASK_SECRET;
    let password = process.env.METAMASK_PASSWORD;
    if (!secret) throw `Missing metamask secret! You need to add the environment variable 'METAMASK_SECRET' for the tests to work`;
    if (!password) throw `Missing metamask secret! You need to add the environment variable 'METAMASK_PASSWORD' for the tests to work`;
    await Metamask.instance.importAccount(secret, password);
    await Metamask.instance.switchNetwork(Network.Kovan);
});

After(async function (this: World, scenario: HookScenarioResult) {
    if (scenario.result.status === Status.FAILED) {
        // Take screenshot and attach it to the test
        let base64 = await oh.browser.takeScreenshot();
        //this.attach(base64, 'image/png');
    }
    await oh.restart();
});

