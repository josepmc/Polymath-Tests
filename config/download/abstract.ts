export interface DownloadedFile {
    name: string;
    contents: string;
}

export interface DownloadConfig {
    uuid: string;
    [k: string]: string;
}

export abstract class DownloadManager {
    public abstract downloadPath(): string;
    public abstract generateDownloadPath(): string;
    public abstract getFiles(globFilter: string): Promise<DownloadedFile[]>;
    public abstract waitForDownload(globFilter: string): Promise<DownloadedFile>;
    public abstract getConfig(): DownloadConfig;
    public abstract restoreConfig(config: DownloadConfig): void;
    public static restore(config: DownloadConfig): DownloadManager {
        return new this.registeredClasses[config.uuid](config);
    }
    constructor(protected config: DownloadConfig) { }
    private static registeredClasses: { [k: string]: { new(config: DownloadConfig): DownloadManager } } = {};
    public static Register<T extends DownloadManager>(type: { new(config: DownloadConfig): T }, uuid: string) {
        if (this.registeredClasses[uuid])
            throw `DownloadManager: ${uuid} is already registered, can't reregister`;
        this.registeredClasses[uuid] = type;
    }
}