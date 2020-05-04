# smart_ci
smart contracts CI

## Useage

> update smart_contracts coding

```bash 
git submodule update --remote smart_v3
```

> dependencies

|  Module  |  Comments  |
|  ----  |  ----  |
|  Node  | version >= 10 |
|  yarn  | version >= 1.19.0 |
|  solc  | ^0.5.x  |

> install dependencies package

```bash
yarn install or npm install
``` 

## Commands

```bash
npm run start                   # start ganache client listen on 7545 
npm run build                   # compiling contracts
npm run deploy                  # deploy contracts to evm
```

## Configuration

> Contracts Directory Configuration

file .env

```bash 
DIST_ABI='build/contracts'
CONTRACT_PATH='smart_v3/contracts'
DEPLOYED_DIST='dist/contracts'
SOLC_VERSION=
AUTHOR=
VERSION=v3
MODE=development
HOST=127.0.0.1
PORT=7545
CHAIN_ID=1337
ACC_PRI_KEYS=0x......,0x......
ACC_ADDRESSES=

```

### Deploy 
