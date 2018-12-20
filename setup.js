#!/usr/bin/env node
const { resolve } = require('path');
const { mkdirpSync, removeSync, readFileSync, pathExistsSync, writeFileSync, existsSync, createWriteStream } = require('fs-extra');
const { argv } = require('yargs');
const { execSync, exec } = require('child_process');
const deasync = require('deasync');
const treeKill = require('tree-kill');
let { MongodHelper } = require('@josepmc/mongodb-prebuilt');
const findProcess = require('find-process');

if (!argv.params || !argv.params.setup || !(argv.params.setup === true || argv.params.setup instanceof Object)) {
    throw `Usage: setup.js [--params.setup.apps=[apps directory]] [--params.setup.ganache]
    All parameters are mutually exclusive`;
}

let currentDir = __dirname;
let checkoutDir = process.env.TEST_CHECKOUT_DIR || resolve(__dirname, 'git-checkout');
let pidsFile = resolve(checkoutDir, 'pids.pid');
console.log('Performing cleanup...');
if (existsSync(pidsFile)) {
    for (let p of readFileSync(pidsFile, 'utf8').split('\n')) {
        try { deasync(r => treeKill(p, 'SIGKILL', r))(); } catch (error) { }
    }
    removeSync(pidsFile);
}
if (process.env.TEST_COVERAGE !== false) process.env.TEST_COVERAGE = true;
if (!process.env.TEST_NO_DELETE_ENV) removeSync(checkoutDir);
mkdirpSync(checkoutDir);
let logDir = process.env.TEST_LOG_DIR || resolve(currentDir, 'logs');
mkdirpSync(logDir);

let findAndKill = port => {
    deasync(async callback => {
        let proc = await findProcess('port', port);
        for (let p of proc)
            await new Promise((r, e) => {
                treeKill(p.pid, 'SIGKILL', err => {
                    if (err) console.log(`Error while killing ${p}: ${err}`);
                    r();
                })
            });
        callback();
    })();
}

let sources = {
    apps: {
        url: "https://github.com/PolymathNetwork/polymath-apps.git",
    },
};

let logs = {
    issuer: resolve(logDir, "issuer.log"),
    investor: resolve(logDir, "investor.log"),
    offchain: resolve(logDir, "offchain.log"),
    ganache: resolve(logDir, "ganache.log"),
};

let pids = {};
let defaultBranch = 'develop';
let branch = process.env.TEST_BRANCH || process.env.TRAVIS_BRANCH || defaultBranch;
let charSep = process.platform === "win32" ? ';' : ':';
const setNodeVersion = () => {
    let path = process.env.PATH.replace(/[:;]?[^:;]*node_modules[^:;]*/g, '');
    if (path.endsWith(charSep)) path = path.substr(0, path.length - 1);
    path = `${process.env.TEST_EXTRA_PATH ? process.env.TEST_EXTRA_PATH + charSep : ''}${resolve(__dirname, 'node_modules', '.bin')}${charSep}${path}`;
    console.log(`Using path: ${path}`);
    return path;
}

if (!process.env.TEST_MM_NETWORK || !process.env.TEST_MM_SECRET) {
    console.log(`Metamask network or secret is not set, using defaults`);
    process.env.TEST_MM_SECRET = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
    process.env.TEST_MM_NETWORK = "l";
}
let mongo;

const setup = {
    git: async function (source, dir) {
        // Git mode
        let branchExists = execSync(`git ls-remote --heads ${source.url} ${branch}`, { cwd: checkoutDir }).toString();
        if (!branchExists) console.log(`Warning! Branch ${branch} doesn't exist in remote repository ${source.url}, defaulting to ${defaultBranch}`);
        else console.log(`Using branch ${branch} for ${source.url}, checking out to ${dir}`);
        if (!pathExistsSync(dir)) {
            execSync(`git clone --depth=1 --branch=${branchExists ? branch : defaultBranch} "${source.url}" "${dir}"`, { cwd: checkoutDir, stdio: 'inherit' });
        }
        else {
            execSync(`git checkout ${branchExists ? branch : defaultBranch}`, { cwd: dir, stdio: 'inherit' });
            execSync('git pull', { cwd: dir, stdio: 'inherit' });
        }
    },
    ganache: async function (baseOpts) {
        console.log('Starting ganache...');
        if (!(typeof baseOpts === 'string' || baseOpts instanceof String)) {
            process.env.TEST_NO_BUILD = true;
            baseOpts = await setup.apps(true);
        }
        let folder = resolve(baseOpts, 'packages', 'new-polymath-scripts');
        if (!existsSync(folder))
            throw `Can't find new-polymath-scripts`;
        let path = setNodeVersion();
        findAndKill(8545);
        if (!process.env.TEST_NO_STARTUP) execSync('yarn --network-timeout=100000', { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, NODE_ENV: 'development' } });
        path = `${resolve(folder, 'node_modules', '.bin')}${charSep}${path}`;
        path = `${resolve(baseOpts, 'node_modules', '.bin')}${charSep}${path}`;
        console.log(`Using path: ${path}`);
        let pid = exec(`yarn local-blockchain:start`, { cwd: folder, env: { ...process.env, PATH: path, NODE_ENV: 'development' } });
        let file = createWriteStream(logs.ganache);
        await new Promise((r, e) => {
            let oldWrite = file.write;
            let seenOn = false;
            file.write = (data, error) => {
                oldWrite.call(file, data, error);
                console.log(data);
                if (file.write != oldWrite) {
                    if (data.indexOf('Listening on') !== -1) {
                        console.log(`Ganache is listening on ${data}, waiting for init script to finish...`);
                        seenOn = true;
                    }
                    if (seenOn && data.indexOf('child process exited with code') !== -1) {
                        file.write = oldWrite;
                        r();
                    }
                    if (data.toLowerCase().indexOf('error') !== -1) {
                        file.write = oldWrite;
                        e(data);
                    }
                }
            }
            pid.stdout.pipe(file);
            pid.stderr.pipe(file);
        });
        pids.ganache = pid;
        writeFileSync(pidsFile, Object.values(pids).map(p => p.pid).join('\n'));
        console.log(`Ganache started with pid ${pid.pid}`);
    },
    offchain: async function (baseOpts) {
        console.log('Starting offchain...');
        // TODO: Reset offchain on test end
        let folder = `${baseOpts}/packages/polymath-offchain`;
        let path = setNodeVersion();
        process.env.TEST_MONGO_DIRECTORY = resolve(__dirname, 'mongo');
        let port = 3001;
        findAndKill(port);
        let db = resolve(checkoutDir, 'mongo');
        mkdirpSync(db);
        let mongodHelper = new MongodHelper([
            '--port', "27017",
            '--dbpath', db,
        ]);
        await mongodHelper.run().then((started) => {
            console.log('mongod is running');
            mongo = mongodHelper;
        }, (e) => {
            console.log('error starting mongodb', e);
        });
        if (!process.env.TEST_NO_STARTUP) execSync('yarn --network-timeout=100000', { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, NODE_ENV: 'development' } });
        path = `${resolve(folder, 'node_modules', '.bin')}${charSep}${path}`;
        path = `${resolve(baseOpts, 'node_modules', '.bin')}${charSep}${path}`;
        console.log(`Using path: ${path}`);
        let pid = exec(`yarn start`, { cwd: folder, env: { ...process.env, PATH: path, PORT: port, NODE_ENV: 'development' } });
        let file = createWriteStream(logs.offchain);
        await new Promise((r, e) => {
            let oldWrite = file.write;
            file.write = (data, error) => {
                oldWrite.call(file, data, error);
                console.log(data);
                if (file.write != oldWrite) {
                    if (data.indexOf('Server is listening on port') !== -1) {
                        file.write = oldWrite;
                        r();
                    }
                    if (data.toLowerCase().indexOf('error') !== -1) {
                        file.write = oldWrite;
                        e(data);
                    }
                }
            }
            pid.stdout.pipe(file);
            pid.stderr.pipe(file);
        });
        pids.offchain = pid;
        writeFileSync(pidsFile, Object.values(pids).map(p => p.pid).join('\n'));
        console.log(`Offchain started with pid ${pid.pid}`);
    },
    issuer: async function (baseOpts) {
        console.log('Starting issuer...');
        let port = 3000;
        findAndKill(port);
        let pid = exec(`yarn serve -s "${baseOpts}/packages/polymath-issuer/build"`, { cwd: currentDir, env: { ...process.env, PORT: port } });
        let file = createWriteStream(logs.issuer);
        pid.stdout.pipe(file);
        pid.stderr.pipe(file);
        pids.issuer = pid;
        writeFileSync(pidsFile, Object.values(pids).map(p => p.pid).join('\n'));
        console.log(`Issuer started with pid ${pid.pid}`);
    },
    investor: async function (baseOpts) {
        console.log('Starting investor...');
        let port = 3002;
        findAndKill(port);
        let pid = exec(`yarn serve -s "${baseOpts}/packages/polymath-investor/build"`, { cwd: currentDir, env: { ...process.env, PORT: port } });
        let file = createWriteStream(logs.investor);
        pid.stdout.pipe(file);
        pid.stderr.pipe(file);
        pids.investor = pid;
        writeFileSync(pidsFile, Object.values(pids).map(p => p.pid).join('\n'));
        console.log(`Investor started with pid ${pid.pid}`);
    },
    apps: async function (baseOpts) {
        let folder = resolve(checkoutDir, 'apps');
        if (baseOpts === true) await this.git(sources.apps, folder);
        else folder = baseOpts;
        folder = resolve(folder);
        if (!process.env.TEST_SKIP_OFFCHAIN) {
            process.env.REACT_APP_POLYMATH_OFFCHAIN_ADDRESS = `http://${process.env.TEST_LOCALHOST}:3001`;
            process.env.POLYMATH_OFFCHAIN_URL = `http://${process.env.TEST_LOCALHOST}:3001`;
            process.env.POLYMATH_ISSUER_URL = `http://${process.env.TEST_LOCALHOST}:3000`;
            process.env.WEB3_NETWORK_LOCAL_WS = `ws://localhost:8545`;
            process.env.TEST_MONGODB_URI = `mongodb://localhost:27017/polymath`;
            process.env.REACT_APP_DEPLOYMENT_STAGE = `local`;
        }
        process.env.REACT_APP_NETWORK_LOCAL_WS = `ws://${process.env.TEST_LOCALHOST}:8545`;
        if (!process.env.TEST_NO_STARTUP && existsSync(resolve(folder, 'package.json'))) {
            console.log('Installing apps...');
            let path = setNodeVersion();
            execSync('yarn --network-timeout=100000', { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, NODE_ENV: 'development' } });
            path = `${resolve(folder, 'node_modules', '.bin')}${charSep}${path}`;
            // This should be removed in the near future
            //process.env.REACT_APP_NODE_WS = `ws://${process.env.TEST_LOCALHOST}:8545`;
            if (!process.env.TEST_NO_BUILD) execSync('yarn build:apps', { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, NODE_ENV: 'development' } });
        }
        return folder;
    },
    all: function (folder) {
        deasync(async function (callback) {
            try {
                folder = await setup.apps(folder);
                await setup.ganache(folder);
                if (!process.env.TEST_SKIP_OFFCHAIN) await setup.offchain(folder);
                await setup.issuer(folder);
                await setup.investor(folder);
                callback(null);
            } catch (error) {
                callback(error);
            }
        })();
    }
}

const kill = () => {
    if (mongo) {
        mongo.closeHandler(0);
        mongo = null;
    }
    if (!pids) return;
    console.log('Killing processes...');
    for (let proc in pids) {
        try {
            treeKill(pids[proc].pid, 'SIGKILL');
        } catch (error) {
            console.log(`Error while terminating process ${proc}: ${error}`);
        }
    }
    pids = null;
    removeSync(pidsFile);
    if (process.env.TEST_PRINT_LOGS) for (let log in logs) {
        console.log(`Printing output of ${log}: ${logs[log]}`);
        console.log(readFileSync(logs[log], 'utf8'));
    }
};
process.on('SIGINT', function () {
    console.log("Caught interrupt signal, exiting...");
    kill();
    process.exit(0);
});
process.on('exit', function () {
    kill();
});

if (argv.params.setup.ganache) {
    deasync(async function (callback) {
        try {
            await setup.ganache(argv.params.setup.ganache);
            callback(null);
        } catch (error) {
            callback(error);
        }
    })();
} else if (argv.params.setup.apps) {
    setup.all(argv.params.setup.apps);
} else {
    throw `Unknown parameter for setup ${JSON.stringify(argv.params.setup)}`;
}

module.exports = kill;
console.log(`Setup complete, started the following processes: ${Object.entries(pids).map(e => e[0] + ': ' + e[1].pid).join(', ')}
Press Ctrl+C to terminate them.`);