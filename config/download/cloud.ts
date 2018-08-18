import { DownloadManager, DownloadedFile, DownloadConfig } from "./abstract";

export class CloudDownloadManager extends DownloadManager {
    public static UUID: string = 'CLOUD_DOWNLOAD_MANAGER';
    public restoreConfig(config: DownloadConfig): void {
        return null;
    }
    public getConfig(): DownloadConfig {
        return { uuid: CloudDownloadManager.UUID, downloadPath: this._downloadPath };
    }
    protected _downloadPath: string;
    constructor(config?: DownloadConfig) {
        super(config);
        if (config) this.restoreConfig(config);
        else {
            this.generateDownloadPath();
        }
    }

    public generateDownloadPath(): string {
        return null;
    }
    public downloadPath(): string {
        return null;
    }

    public async getFiles(filter: string): Promise<DownloadedFile[]> {
        return null;
    }

    public waitForDownload(name: string, maxWait?: number): Promise<DownloadedFile> {
        return null;
    }
}

DownloadManager.Register(CloudDownloadManager, CloudDownloadManager.UUID);