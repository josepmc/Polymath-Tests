import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import * as path from 'path';

let baseDir = process.env.TMP_DIR || null;
if (baseDir && !path.isAbsolute(baseDir)) baseDir = path.join(__dirname, '..', baseDir);

if (baseDir) {
    if (fs.pathExistsSync(baseDir)) fs.removeSync(baseDir);
    fs.mkdirpSync(baseDir);
}
else {
    tmp.setGracefulCleanup();
}

interface TmpOptions {
    prefix?: string;
    postfix?: string;
    dir?: string;
}

export function tmpDir(opts: TmpOptions = {}): string {
    if (!opts.dir && baseDir) opts.dir = baseDir;
    return tmp.dirSync({ ...opts, discardDescriptor: true }).name;
}

export function tmpFile(opts: TmpOptions = {}): string {
    if (!opts.dir && baseDir) opts.dir = baseDir;
    return tmp.fileSync({ ...opts, discardDescriptor: true }).name;
}