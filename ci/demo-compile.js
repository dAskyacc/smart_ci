const chalk = require("chalk"),
  fs = require('fs-extra'),
  path = require('path'),
  solc = require('solc');

const r = (...p) => path.resolve(__dirname,'../',...p)
console.log(r('.env'))
const dotEnv = require('dotenv').config({
  path:r('.env'),
  encoding:'utf8'
})

if(dotEnv.error){
  console.log(chalk.red('Load env error.'),dotEnv.error)
  process.exit(1)
}

const envArgs = dotEnv.parsed

if(envArgs.MODE === 'development'){
  console.log(chalk.blue('Load env completed.'),JSON.stringify(envArgs))
}

const COMPILE_ENV = {
  target:envArgs.DIST_ABI||'build/contracts',
  contractSrc:envArgs.CONTRACT_PATH||'smart_v3/contracts',
  compileVersion:envArgs.SOLC_VERSION||'soljson-v0.5.17+commit.d19bba13.js'
}

function compilingPreperations(){
  const buildPath = r(COMPILE_ENV.target)
  fs.removeSync(buildPath)

  return buildPath
}

/**
 * @DateTime 2020-05-04
 * outputSelection:
 *   See https://solidity.readthedocs.io/en/v0.5.3/using-the-compiler.html
 */
function createConfiguration(){
  return {
    language:'Solidity',
    sources:{
      'DogCollection.sol':{
        content:fs.readFileSync(r(COMPILE_ENV.contractSrc,'DogCollection.sol'),'utf8')
      }
    },
    settings:{
      evmVersion:"byzantium",
      outputSelection:{
        '*':{
          '*':['abi','evm.bytecode.object']
        }
      }
    }
  }
}

function compileSources(config) {
  try{
    console.log(solc.compile(JSON.stringify(config,null,2)))
    return JSON.parse(solc.compile(JSON.stringify(config),getImports))
  }catch(e){
    console.log(chalk.red('Compile Contracts error \n'),e)
  }
}

function getImports(dependency) {
  console.log(chalk.green('Match dependencies for import>>>'),dependency)

  switch(dependency){
    case 'Dog.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'Dog.sol'),'utf8')
      }

    default:
      return {error:`file ${dependency} not found.`}
  }

}

function errorHandling(compiledSources) {
  if(!compiledSources){
    console.error(chalk.red('>>>>>>>>>>>>>> ERRORS <<<<<<<<<<<<<<<<<\n'),'NO OUTPUT')
  }else if(compiledSources.errors){
    compiledSources.errors.map(err=> console.log(chalk.red(err.formattedMessage),'\n'))
  }
}

function writeOutput(compiled,buildPath) {
  fs.ensureDirSync(buildPath)

  for(let contractFileName in compiled.contracts){
    const contractName = contractFileName.replace('.sol','')
    console.log(chalk.green('Writing:'),chalk.yellow(contractName+'.json'))

    fs.outputJsonSync(
      r(buildPath,`${contractName}.json`),
      {
        abi:compiled.contracts[contractFileName][contractName].abi||[],
        bytecode:compiled.contracts[contractFileName][contractName].evm.bytecode.object||''
      },
      {
        spaces:2,
        EOL:'\n'
      }
    );
  }
}

//workflow
//
const buildpath = compilingPreperations();
const config = createConfiguration();
const compiled = compileSources(config)

errorHandling(compiled)

writeOutput(compiled,buildpath);