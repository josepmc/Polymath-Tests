import * as tmp from 'tmp';
import * as fs from 'fs';
import * as path from 'path';

const TMP_DIR = process.env.TMP_DIR || null;

if (TMP_DIR) {
    fs.mkdirSync(TMP_DIR);
}
else {
    tmp.setGracefulCleanup();
}

interface TmpOptions {
    prefix?: string;
    postfix?: string;
}

export function tmpDir(opts: TmpOptions = {}): string {
    if (TMP_DIR) {
        let dir = path.join(TMP_DIR, `${opts.prefix}${tmp.tmpNameSync()}${opts.postfix}`);
        fs.mkdirSync(dir);
        return dir;
    }
    return tmp.dirSync({ ...opts, discardDescriptor: true }).name;
}

export function tmpFile(opts: TmpOptions = {}): string {
    if (TMP_DIR) {
        let file = path.join(TMP_DIR, `${opts.prefix}${tmp.tmpNameSync()}${opts.postfix}`);
        fs.writeFileSync(file, '');
        return file;
    }
    return tmp.fileSync({ ...opts, discardDescriptor: true }).name;
}