#!/bin/bash

CURRENT_DIR=$(pwd)
if [ -f "setup.env" ]; then
    source "setup.env"
else
    SETUP_ALL=true
    GANACHE_FROM="https://github.com/PolymathNetwork/polymath-core.git"
    ISSUER_FROM="https://github.com/PolymathNetwork/polymath-issuer.git"
    INVESTOR_FROM="https://github.com/PolymathNetwork/polymath-investor.git"
    OFFCHAIN_FROM="https://github.com/PolymathNetwork/polymath-offchain.git"

    if [ -z "${LOG_DIR+x}" ]; then
        LOG_DIR="$CURRENT_DIR/logs"
    fi
    mkdir -p "$LOG_DIR"
    export ISSUER_LOG="$LOG_DIR/issuer.log"
    export INVESTOR_LOG="$LOG_DIR/investor.log"
    export OFFCHAIN_LOG="$LOG_DIR/offchain.log"
    export MIGRATION_LOG="$LOG_DIR/migration.log"
    export GANACHE_LOG="$LOG_DIR/ganache.log"
    export GANACHE_DB="/tmp/ganache.db"
    export GANACHE_PORT=8545 #8080 Doesn't work still
    export GANACHE_GAS=9000000
fi
if [ -z "${LOCALHOST+x}" ]; then
    LOCALHOST="localhost"
fi

while test $# -gt 0
do
    case "$1" in
        --only-ganache)
            SETUP_ALL=false
            SETUP_GANACHE=true
            ;;
        --issuer)
            shift
            ISSUER_FROM="$1"
            GANACHE_FROM="$1/node_modules/polymath_core"
            ;;
        --investor)
            shift
            INVESTOR_FROM="$1"
            GANACHE_FROM="$1/node_modules/polymath_core"
            ;;
        --offchain)
            SETUP_OFFCHAIN=false
            OFFCHAIN_FROM="$1"
            ;;
        --k)
            KILL=true
            ;;
        *)
        --*) echo "Unknown option $1. Exiting."; exit 1
            ;;
    esac
    shift
done

cd_to_dir() {
    if [ ! -d "$1" ]; then
        git clone --depth=1 --branch=master "$1" $2
        GANACHE_FROM="$(pwd)/$2"
    fi
    cd "$1"
}

if [ $KILL ]; then
    if [ "${GANACHE_PID+x}" ]; then
      kill -9 $GANACHE_PID
      cat "$GANACHE_LOG"
    fi
    if [ "${OFFCHAIN_PID+x}" ]; then
      kill -9 $OFFCHAIN_PID
      cat "$OFFCHAIN_LOG"
    fi
    if [ "${ISSUER_PID+x}" ]; then
      kill -9 $ISSUER_PID
      cat "$ISSUER_LOG"
    fi
    if [ "${INVESTOR_PID+x}" ]; then
      kill -9 $INVESTOR_PID
      cat "$INVESTOR_LOG"
    fi
    exit 0
fi

if [ $SETUP_ALL ] || [ $SETUP_GANACHE ]; then
    # Setup Ganache
    if [ -z "${METAMASK_NETWORK+x}" ]; then
      export METAMASK_SECRET="cotton trap squeeze wealth aunt fork hungry notice entry early combine chalk"
      export METAMASK_NETWORK=l
      export GANACHE_NETWORK=100000015
      export GANACHE_GAS=9000000
    fi
    cd_to_dir "$GANACHE_FROM" "polymath-core"
    nvm install v8
    npm install -g truffle
    npm install
    rm -rf "$GANACHE_DB"
    mkdir -p "$GANACHE_DB"
    perl -0777 -pe "s/(development: {[^}]*})/development: { host: 'localhost', network_id: '$GANACHE_NETWORK', port: $GANACHE_PORT, gas: $GANACHE_GAS }/" -i truffle.js
    ganache-cli -e 100000 -i $GANACHE_NETWORK -l $GANACHE_GAS --db "$GANACHE_DB" -p $GANACHE_PORT -m "$METAMASK_SECRET" &> "$GANACHE_LOG" &
    export GANACHE_PID=$!
    while [ ! -f "$GANACHE_LOG" ]; do sleep 1 ; done
    sh -c 'tail -n +0 -f "$GANACHE_LOG" | { sed "/Listening on/ q" && kill $$ ;}'
    export GANACHE_CONTRACTS="{"$(truffle migrate --reset --all --network development | tee "$MIGRATION_LOG" | sed  -e "1,/^Using network \'.*\'.$/ d; /----- Polymath Core Contracts -----/,\$d; /^[^:]*$/ d; /^.*\.js$/ d; s/^ *\([^:]*\): *\([^ ]*\) *$/ \"\1\" : { \"$GANACHE_NETWORK\" : \"\2\" }/g" | tr '\n' ', ' | sed 's/,$//')" }"
    cat "$MIGRATION_LOG"
    cd "$CURRENT_DIR"
fi

if [ $SETUP_ALL ]; then
    cd_to_dir "$OFFCHAIN_FROM" "polymath-offchain"
    nvm install v8
    yarn
    PORT=3001 yarn start &> "$OFFCHAIN_LOG" &
    export OFFCHAIN_PID=$!
    export REACT_APP_POLYMATH_OFFCHAIN_ADDRESS="http://$LOCALHOST:3001"
    cd "$CURRENT_DIR"
fi

if [ $SETUP_ALL ]; then
    cd_to_dir "$ISSUER_FROM" "polymath-issuer"
    nvm install v8
    yarn
    PORT=3000 yarn start &> "$ISSUER_LOG" &
    export ISSUER_PID=$!
    cd "$CURRENT_DIR"
fi

if [ $SETUP_ALL ]; then
    cd_to_dir "$INVESTOR_FROM" "polymath-investor"
    nvm install v8
    yarn
    PORT=3002 yarn start &> "$INVESTOR_LOG" &
    export INVESTOR_PID=$!
    cd "$CURRENT_DIR"
fi

export -p > setup.env