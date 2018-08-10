import { oh, RunnerConfig } from './helpers';
import * as path from 'path';
import { Capabilities } from 'selenium-webdriver';

// TODO: Refactor this class altogether
export class TestConfig {
    private static readonly capabilityKey: string = 'customTestConfig';
    private constructor(public capabilities: Capabilities, public protractorConfig: RunnerConfig) { }

    public get remote(): boolean {
        // This should work as long as we use RemoteWebDriver (e.g. to a Selenium Server)
        return this.capabilities.get('webdriver.remote.sessionid');
    }

    public static get reportPath(): string {
        return path.join(__dirname, '..', 'reports');
    }

    public static get instance(): TestConfig {
        if (!oh) return null;
        // Instance is going to differ based on the browser
        let caps = oh.browser.getCapabilities();
        let cfgcaps: TestConfig = caps.get(this.capabilityKey);
        if (cfgcaps == null) {
            let config = oh.browser.getProcessedConfig();
            cfgcaps = new TestConfig(caps, config);
            caps.set(this.capabilityKey, cfgcaps);
        }
        return cfgcaps;
    }

    private shutdownMethods: (() => Promise<{}> | {})[] = [];
    public static async registerShutdownProcedure(fn: () => Promise<{}> | {}): Promise<void> {
        this.instance.shutdownMethods.push(fn);
    }

    public static async shutdown(): Promise<void> {
        for (let method of this.instance.shutdownMethods) { await method(); }
    }
}
