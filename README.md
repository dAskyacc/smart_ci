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
npm run build                   # compiling contracts
npm run deploy                  # deploy contracts to evm
```

## Configuration

> Contracts Directory Configuration

file .env

```bash 
DIST_ABI='build/contracts'
CONTRACT_PATH='smart_v3/contracts'
SOLC_VERSION=
MODE=development
INFURA_SECRET=
INFURA_PROJECTID=

```

### Deploy 
