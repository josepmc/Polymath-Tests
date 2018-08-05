import { DownloadManager, DownloadedFile, DownloadConfig } from "./abstract";
import * as tmp from 'tmp';
import { sync as rmdir } from 'rimraf';
import { sync as glob } from 'glob';
import * as fs from 'fs';

export class LocalDownloadManager extends DownloadManager {
    public static UUID: string = 'LOCAL_DOWNLOAD_MANAGER';
    public restoreConfig(config: DownloadConfig): void {
        this._downloadPath = config.downloadPath;
    }
    public getConfig(): DownloadConfig {
        return { uuid: LocalDownloadManager.UUID, downloadPath: this._downloadPath };
    }
    protected _downloadPath: string;
    constructor(config?: DownloadConfig) {
        super(config);
        if (config) this.restoreConfig(config);
        else {
            this._downloadPath = tmp.dirSync().name;
            process.on('exit', () => {
                rmdir(this._downloadPath);
            });
        }
    }

    public downloadPath(): string {
        return this._downloadPath;
    }

    public async getFiles(filter: string): Promise<DownloadedFile[]> {
        let files: DownloadedFile[] = [];
        for (let file of glob(filter, { cwd: this._downloadPath })) {
            files.push({ name: file, contents: fs.readFileSync(file, 'utf8').toString() });
        }
        return files;
    }

    public waitForDownload(filter: string): Promise<DownloadedFile> {
        throw new Error("Method not implemented.");
    }
}

DownloadManager.Register(LocalDownloadManager, LocalDownloadManager.UUID);