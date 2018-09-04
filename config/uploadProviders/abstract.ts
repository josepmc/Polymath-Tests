
export abstract class UploadProvider {
    private static registeredProviders: { [k: string]: { new(opts: Object): UploadProvider } } = {};
    private static instanceProviders: { [k: string]: UploadProvider } = {};
    public static Register<T extends UploadProvider>(provider: { new(opts: Object): T }, providerKey: string) {
        this.registeredProviders[providerKey] = provider;
    }
    protected abstract testsCompletedUpload(reportsDir: string): Promise<void>;
    protected abstract addTestValue(name: string, row: { [k: string]: string }): Promise<void>;
    public abstract init(): Promise<void>;
    public static async init(): Promise<void> {
        let providers: Object;
        // Some providers may have multiline strings
        eval(`providers = ${(process.env.UPLOAD_PROVIDERS || '{}')}`);
        for (let provider in providers) {
            let reg = this.registeredProviders[provider];
            if (reg) {
                let prov = new reg(providers[provider]);
                await prov.init();
                this.instanceProviders[provider] = prov;
            } else {
                console.log(`Missing upload provider for ${provider}`);
            }
        }
    }
    public static async upload(reportsDir: string): Promise<void> {
        for (let prov in this.instanceProviders) {
            await this.instanceProviders[prov].testsCompletedUpload(reportsDir);
        }
    }
}