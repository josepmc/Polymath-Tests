export interface ExtensionInfo {
    extension: { new(...args): Extension };
    name: string;
    supportedBrowsers: ExtensionBrowser;
}

export class ExtensionManager {
    public static extensions: ExtensionInfo[] = [];
    public static Register(extension: ExtensionInfo) {
        this.extensions.push(extension);
    }
    public static GetExtensions(browser: ExtensionBrowser): ExtensionInfo[] {
        return this.extensions.filter(ex => ex.supportedBrowsers & browser);
    }
    public static GetFileExtensionForBrowser(browser: ExtensionBrowser) {
        switch (browser) {
            case ExtensionBrowser.Brave:
            case ExtensionBrowser.Opera:
            case ExtensionBrowser.Chrome:
                return 'crx';
            case ExtensionBrowser.Firefox:
                return 'xpi';
            case ExtensionBrowser.Safari:
                return 'xyz';
            case ExtensionBrowser.Edge:
                return 'appx';
        }
    }
}

export enum ExtensionBrowser {
    None = 0, Chrome, Firefox, Edge, Safari, Brave, Opera
}

export interface ExtensionData {
    file: string;
    uncompressed: string;
    afterExecution: (() => Promise<void> | void);
}

export interface ExtensionConfig {
    key: string;
    config: Object;
}

export abstract class Extension {
    public abstract async getExtension(browser: ExtensionBrowser): Promise<ExtensionData>;
    // This configuration will be sent via protractor config to the different browsers
    // It must be able to recreate whatever information is necessary to interact
    // with the extension
    public abstract getConfig(): ExtensionConfig;
}