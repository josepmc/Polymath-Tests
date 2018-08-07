import { DownloadManager, DownloadedFile, DownloadConfig } from "./abstract";
import * as tmp from 'tmp';
import { sync as rmdir } from 'rimraf';
import { sync as glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

enum FileStatus {
    Modified, NoFile, Created, Deleted
}

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

    public waitForDownload(name: string, maxWait?: number): Promise<DownloadedFile> {
        console.log(`Waiting for download with filter '${name}' on ${this.downloadPath()}`);
        let self = this;
        let secondsBy = 0;
        return new Promise<DownloadedFile>((r, e) => {
            const interval = setInterval(function () {
                if (secondsBy++ >= maxWait) {
                    clearInterval(interval);
                    e(`Wait for Download - Timeout waiting for ${name} to appear in ${self.downloadPath()}`);
                }
                let found = glob(name, { cwd: self.downloadPath() });
                if (found.length) {
                    clearInterval(interval);
                    let file = path.join(self.downloadPath(), found[0]);
                    r({ name: file, contents: fs.readFileSync(file, 'utf8') });
                }
            }, 1000);
        });;
    }
}

DownloadManager.Register(LocalDownloadManager, LocalDownloadManager.UUID);