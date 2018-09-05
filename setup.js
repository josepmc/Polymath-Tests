const { join } = require('path');
const { mkdirpSync, removeSync, createWriteStream, readFileSync, pathExistsSync, writeFileSync, existsSync } = require('fs-extra');
const { argv } = require('yargs');
const { execSync, exec } = require('child_process');
const deasync = require('deasync');
const treeKill = require('tree-kill');

if (!argv.params || !argv.params.setup || !(argv.params.setup === true || argv.params.setup instanceof Object)) {
    throw `Usage: setup.js [--ganache] [--issuer <path>] [--investor <path>] [--offchain <path>]
    All parameters are mutually exclusive`;
}

let currentDir = __dirname;
let checkoutDir = process.env.CHECKOUT_DIR || join(__dirname, 'git-checkout');
let pidsFile = join(checkoutDir, 'pids.pid');
if (existsSync(pidsFile)) {
    for (let p of readFileSync(pidsFile, 'utf8').split('\n')) {
        try { deasync(r => treeKill(p, 'SIGKILL', r))(); } catch (error) { }
    }
    removeSync(pidsFile);
}
if (!process.env.NO_DELETE_ENV) removeSync(checkoutDir);
mkdirpSync(checkoutDir);
let logDir = process.env.LOG_DIR || join(currentDir, 'logs');
mkdirpSync(logDir);
let ganacheDb = "/tmp/ganache.db";
execSync("unset npm_config_prefix; curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash", { cwd: checkoutDir, stdio: 'inherit', shell: '/bin/bash' });

let sources = {
    ganache: {
        url: "https://github.com/PolymathNetwork/polymath-core.git",
        npm: 'polymath-core'
    },
    issuer: {
        url: "https://github.com/PolymathNetwork/polymath-issuer.git",
        npm: 'polymath-issuer'
    },
    investor: {
        url: "https://github.com/PolymathNetwork/polymath-investor.git",
        npm: 'polymath-investor'
    },
    offchain: {
        url: "https://github.com/PolymathNetwork/polymath-offchain.git",
        npm: 'polymath-offchain'
    },
};

let logs = {
    issuer: join(logDir, "issuer.log"),
    investor: join(logDir, "investor.log"),
    offchain: join(logDir, "offchain.log"),
    migration: join(logDir, "migration.log"),
    ganache: join(logDir, "ganache.log"),
};

let pids = {};
let branch = process.env.BRANCH || 'master';
const setNodeVersion = () => {
    execSync(`unset npm_config_prefix; source $HOME/.bashrc; source $NVM_DIR/nvm.sh; nvm install v8`, { cwd: checkoutDir, stdio: 'inherit', shell: '/bin/bash' });
    return execSync(`unset npm_config_prefix; source $HOME/.bashrc &> /dev/null; source $NVM_DIR/nvm.sh; nvm use v8 &> /dev/null; echo $PATH`, { cwd: checkoutDir, shell: '/bin/bash' }).toString();
}

const setup = {
    git: async function (source, dir, useNpm) {
        if (!useNpm) {
            // Git mode
            if (!pathExistsSync(dir))
                execSync(`git clone --depth=1 --branch=${branch} "${source.url}" "${dir}"`, { cwd: checkoutDir, stdio: 'inherit', shell: '/bin/bash' });
            else execSync('git pull', { cwd: dir, stdio: 'inherit', shell: '/bin/bash' });
        } else {
            mkdirpSync(dir);
            execSync(`npm pack ${source.npm}`, { cwd: dir, stdio: 'inherit', shell: '/bin/bash' });
            execSync('tar xvf *.tgz --strip-components=1', { cwd: dir, stdio: 'inherit', shell: '/bin/bash' })
        }
    },
    ganache: async function (opts) {
        if (!opts) opts = { fromDir: false, useNpm: true };
        console.log('Starting ganache...');
        let folder = join(checkoutDir, 'ganache');
        if (!opts.fromDir) this.git(sources.ganache, folder, opts.useNpm);
        else folder = sources.ganache.url;
        if (!process.env.METAMASK_NETWORK) {
            process.env.METAMASK_SECRET = "cotton trap squeeze wealth aunt fork hungry notice entry early combine chalk"
            process.env.METAMASK_NETWORK = "l"
            process.env.GANACHE_NETWORK = 100000015
            process.env.GANACHE_GAS = 9000000
        }
        if (!process.env.GANACHE_PORT) process.env.GANACHE_PORT = 8545;
        let path = setNodeVersion();
        execSync('npm install -g truffle', { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        execSync('npm install', { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        removeSync(ganacheDb);
        mkdirpSync(ganacheDb);
        execSync(`perl -0777 -pe "s/(development: {[^}]*})/development: { host: 'localhost', network_id: '${process.env.GANACHE_NETWORK}', port: ${process.env.GANACHE_PORT}, gas: ${process.env.GANACHE_GAS} }/" -i truffle.js`, { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        console.log('Waiting for ganache to be available...');
        let pid = exec(`ganache-cli -e 100000 -i ${process.env.GANACHE_NETWORK} -l ${process.env.GANACHE_GAS} --db "${ganacheDb}" -p ${process.env.GANACHE_PORT} -m "${process.env.METAMASK_SECRET}" | tee "${logs.ganache}"`, { cwd: folder, env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        await new Promise((r, e) => {
            let waitForInput = function (data) {
                console.log(data);
                if (data.indexOf('Listening on') !== -1) {
                    pid.stdout.removeListener('data', waitForInput);
                    r();
                }
                if (data.indexOf('Error') !== -1) {
                    e(data);
                }
            }
            pid.stdout.on('data', waitForInput);
        });
        pids.ganache = pid;
        writeFileSync(pidsFile, Object.values(pids).map(p => p.pid).join('\n'));
        console.log(`Migrating contracts...`);
        let contracts = "{" + execSync(`truffle migrate --reset --all --network development | tee "${logs.migration}" | sed  -e "1,/^Using network \\'.*\\'.$/ d; /----- Polymath Core Contracts -----/,\\$d; /^[^:]*$/ d; /^.*\\.js$/ d; s/^ *\\([^:]*\\): *\\([^ ]*\\) *$/ \\"\\1\\" : { \\"${process.env.GANACHE_NETWORK}\\" : \\"\\2\\" }/g" | tr '\\n' ', ' | sed 's/,$//'`, { cwd: folder, env: { ...process.env, PATH: path, shell: '/bin/bash' } }).toString() + " }";
        process.env.GANACHE_CONTRACTS = contracts;
        console.log(`Ganache started with pid ${pid.pid}`);
    },
    offchain: async function (opts) {
        if (!opts) opts = { fromDir: false, useNpm: false };
        console.log('Starting offchain...');
        let folder = join(checkoutDir, 'offchain');
        if (!opts.fromDir) this.git(sources.offchain, folder, opts.useNpm);
        else folder = sources.offchain.url;
        let path = setNodeVersion();
        execSync('yarn', { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        let pid = exec(`PORT=3001 yarn start | tee "${logs.offchain}"`, { cwd: folder, env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        pids.offchain = pid;
        writeFileSync(pidsFile, Object.values(pids).map(p => p.pid).join('\n'));
        console.log(`Offchain started with pid ${pid.pid}`);
        process.env.REACT_APP_POLYMATH_OFFCHAIN_ADDRESS = `http://${process.env.LOCALHOST}:3001`
    },
    issuer: async function (opts) {
        if (!opts) opts = { fromDir: false, useNpm: false };
        console.log('Starting issuer...');
        let folder = join(checkoutDir, 'issuer');
        if (!opts.fromDir) this.git(sources.issuer, folder, opts.useNpm);
        else {
            folder = sources.issuer.url;
            sources.ganache.url = join(folder, 'node_modules', 'polymath-core');
        }
        let path = setNodeVersion();
        execSync('yarn', { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        let pid = exec(`PORT=3000 yarn start | tee "${logs.offchain}"`, { cwd: folder, env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        pids.issuer = pid;
        writeFileSync(pidsFile, Object.values(pids).map(p => p.pid).join('\n'));
        console.log(`Issuer started with pid ${pid.pid}`);
    },
    investor: async function (opts) {
        if (!opts) opts = { fromDir: false, useNpm: false };
        console.log('Starting investor...');
        let folder = join(checkoutDir, 'investor');
        if (!opts.fromDir) this.git(sources.investor, folder, opts.useNpm);
        else {
            folder = sources.investor.url;
            sources.ganache.url = join(folder, 'node_modules', 'polymath-core');
        }
        let path = setNodeVersion();
        execSync('yarn', { cwd: folder, stdio: 'inherit', env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        let pid = exec(`PORT=3000 yarn start | tee "${logs.offchain}"`, { cwd: folder, env: { ...process.env, PATH: path, shell: '/bin/bash' } });
        pids.investor = pid;
        writeFileSync(pidsFile, Object.values(pids).map(p => p.pid).join('\n'));
        console.log(`Investor started with pid ${pid.pid}`);
    },
    all: function (setupOpts = {}) {
        deasync(async function (callback) {
            try {
                await setup.offchain(setupOpts.offchain);
                await setup.issuer(setupOpts.issuer);
                await setup.investor(setupOpts.investor);
                await setup.ganache(setupOpts.ganache);
                callback(null);
            } catch (error) {
                callback(error);
            }
        })();
    }
}

if (argv.params.setup.ganache) {
    deasync(async function (callback) {
        try {
            await setup.ganache({ fromDir: false, useNpm: true });
            callback(null);
        } catch (error) {
            callback(error);
        }
    })();
} else {
    let found = false;
    for (let el in sources) {
        if (argv.params.setup[el]) {
            found = true;
            sources[el].url = argv.params.setup[el];
            let opts = {};
            opts[el] = { fromDir: true, useNpm: false };
            setup.all(opts);
            break;
        }
    }
    if (!found) setup.all();
}
console.log(`Setup complete, started the following processes: ${Object.entries(pids).map(e => e[0] + ': ' + e[1].pid)}
Press Ctrl+C to terminate them.`);

const kill = () => {
    if (!pids) return;
    console.log('Killing processes...');
    for (let process in pids)
        try { deasync(r => treeKill(pids[process].pid, 'SIGKILL', r))(); } catch (error) { }
    pids = null;
    removeSync(pidsFile);
    if (process.env.PRINT_LOGS) for (let log in logs) {
        console.log(`Printing output of ${log}: ${log[logs]}`);
        console.log(readFileSync(log[logs], 'utf8'));
    }
};
process.on('SIGINT', function () {
    console.log("Caught interrupt signal, exiting...");
    kill();
});
process.on('exit', function () {
    kill();
});
module.exports = kill;