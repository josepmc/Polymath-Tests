const { join } = require('path');
const { mkdirpSync, removeSync, createWriteStream, readFileSync, pathExistsSync, writeFileSync, existsSync } = require('fs-extra');
const { argv } = require('yargs');
const { execSync, exec } = require('child_process');
const deasync = require('deasync');
const treeKill = require('tree-kill');

if (!argv.setup || !(argv.setup === true || argv.setup instanceof Object)) {
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
process.env.NVM_DIR = join(checkoutDir, ".nvm");
process.env.PROFILE = join(checkoutDir, ".bashrc");
process.env.HOME = checkoutDir;
if (!pathExistsSync(process.env.NVM_DIR)) {
    mkdirpSync(process.env.NVM_DIR);
    execSync("curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash", { cwd: checkoutDir, stdio: 'inherit' });
}

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

const setup = {
    git: async function (source, dir, useNpm) {
        if (!useNpm) {
            // Git mode
            if (!pathExistsSync(dir))
                execSync(`git clone --depth=1 --branch=${branch} "${source.url}" "${dir}"`, { cwd: checkoutDir, stdio: 'inherit' });
            else execSync('git pull', { cwd: dir, stdio: 'inherit' });
        } else {
            mkdirpSync(dir);
            execSync(`npm pack ${source.npm}`, { cwd: dir, stdio: 'inherit' });
            execSync('tar xvf *.tgz --strip-components=1', { cwd: dir, stdio: 'inherit' })
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
        execSync('. "$NVM_DIR/nvm.sh"; nvm install v8', { cwd: folder, stdio: 'inherit' });
        execSync('. "$NVM_DIR/nvm.sh"; npm install -g truffle', { cwd: folder, stdio: 'inherit' });
        execSync('. "$NVM_DIR/nvm.sh"; npm install', { cwd: folder, stdio: 'inherit' });
        removeSync(ganacheDb);
        mkdirpSync(ganacheDb);
        execSync(`perl -0777 -pe "s/(development: {[^}]*})/development: { host: 'localhost', network_id: '${process.env.GANACHE_NETWORK}', port: ${process.env.GANACHE_PORT}, gas: ${process.env.GANACHE_GAS} }/" -i truffle.js`, { cwd: folder, stdio: 'inherit' });
        let pid = exec(`. "$NVM_DIR/nvm.sh"; ganache-cli -e 100000 -i ${process.env.GANACHE_NETWORK} -l ${process.env.GANACHE_GAS} --db "${ganacheDb}" -p ${process.env.GANACHE_PORT} -m "${process.env.METAMASK_SECRET}"`, { cwd: folder });
        let log = createWriteStream(logs.ganache);
        pid.stdout.write = pid.stderr.write = log.write.bind(log);
        await new Promise((r, e) => {
            let waitForInput = function (data) {
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
        let contracts = execSync(`. "$NVM_DIR/nvm.sh" &> /dev/null; echo "{"$(truffle migrate --reset --all --network development | tee "${logs.migration}" | sed  -e "1,/^Using network \\'.*\\'.$/ d; /----- Polymath Core Contracts -----/,\\$d; /^[^:]*$/ d; /^.*\\.js$/ d; s/^ *\\([^:]*\\): *\\([^ ]*\\) *$/ \\"\\1\\" : { \\"${process.env.GANACHE_NETWORK}\\" : \\"\\2\\" }/g" | tr '\\n' ', ' | sed 's/,$//')" }"`, { cwd: folder }).toString();
        process.env.GANACHE_CONTRACTS = contracts;
        console.log(`Ganache started with pid ${pid.pid}`);
    },
    offchain: async function (opts) {
        if (!opts) opts = { fromDir: false, useNpm: false };
        console.log('Starting offchain...');
        let folder = join(checkoutDir, 'offchain');
        if (!opts.fromDir) this.git(sources.offchain, folder, opts.useNpm);
        else folder = sources.offchain.url;
        execSync('. "$NVM_DIR/nvm.sh"; nvm install v8', { cwd: folder, stdio: 'inherit' });
        execSync('. "$NVM_DIR/nvm.sh"; yarn', { cwd: folder, stdio: 'inherit' });
        let pid = exec(`. "$NVM_DIR/nvm.sh"; PORT=3001 yarn start`, { cwd: folder });
        let log = createWriteStream(logs.offchain);
        pid.stdout.write = pid.stderr.write = log.write.bind(log);
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
        execSync('. "$NVM_DIR/nvm.sh"; nvm install v8', { cwd: folder, stdio: 'inherit' });
        execSync('. "$NVM_DIR/nvm.sh"; yarn', { cwd: folder, stdio: 'inherit' });
        let pid = exec(`. "$NVM_DIR/nvm.sh"; PORT=3000 yarn start`, { cwd: folder });
        let log = createWriteStream(logs.issuer);
        pid.stdout.write = pid.stderr.write = log.write.bind(log);
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
        execSync('. "$NVM_DIR/nvm.sh"; nvm install v8', { cwd: folder, stdio: 'inherit' });
        execSync('. "$NVM_DIR/nvm.sh"; yarn', { cwd: folder, stdio: 'inherit' });
        let pid = exec(`. "$NVM_DIR/nvm.sh"; PORT=3000 yarn start`, { cwd: folder });
        let log = createWriteStream(logs.investor);
        pid.stdout.write = pid.stderr.write = log.write.bind(log);
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

if (argv.setup.ganache) {
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
        if (argv.setup[el]) {
            found = true;
            sources[el].url = argv.setup[el];
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