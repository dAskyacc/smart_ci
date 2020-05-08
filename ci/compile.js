const chalk     = require("chalk"),
  DateFormat    = require('fast-date-format'),
  fs            = require('fs-extra'),
  path          = require('path'),
  solc          = require('solc');

const r = (...p) => path.resolve(__dirname,'../',...p)

const stdDateFormat = new DateFormat('YYYY-MM-DD HH:mm:ss');

console.log(r('.env'))
const dotEnv = require('dotenv').config({
  path:r('.env'),
  encoding:'utf8'
})

if(dotEnv.error){
  console.log(chalk.red('Load env error.'),dotEnv.error)
  process.exit(1)
}
var NamePairs = {}

const envArgs = dotEnv.parsed

if(envArgs.MODE === 'development'){
  console.log(chalk.blue('Load env completed.'),JSON.stringify(envArgs))
}

const COMPILE_ENV = {
  target:envArgs.DIST_ABI||'build/contracts',
  contractSrc:envArgs.CONTRACT_PATH||'smart_v3/contracts',
  compileVersion:envArgs.SOLC_VERSION||'soljson-v0.5.17+commit.d19bba13.js',
  es6:false
}

const ContractMapping = {
  'BasDomain.sol':""
}

const IgnoreLibs = [
  'safemath','BasLib'
]

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
      'BasOANN.sol':{
        content:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasOANN.sol'),'utf8')
      },
      'BasMarket.sol':{
        content:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasMarket.sol'),'utf8')
      },
      'BasMail.sol':{
        content:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasMail.sol'),'utf8')
      },
      'BasView':{
        content:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasView.sol'),'utf8')
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

function getImports(dependency) {
  console.log(chalk.green('Match dependencies for import>>>'),chalk.red(dependency),'\n')
  console.log(r(COMPILE_ENV.contractSrc,'BasLib.sol'))

  switch(dependency){
    case 'BasLib.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasLib.sol'),'utf8')
      }
    case 'BasToken.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasToken.sol'),'utf8')
      }
    case 'BasOwnership.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasOwnership.sol'),'utf8')
      }   
    case 'BasMiner.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasMiner.sol'),'utf8')
      }  
    case 'BasDomain.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasDomain.sol'),'utf8')
      }  
    case 'BasMarket.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasMarket.sol'),'utf8')
      }
    case 'BasOANN.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasOANN.sol'),'utf8')
      } 
    case 'BasMail.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'BasMail.sol'),'utf8')
      }  
    case 'owned.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'owned.sol'),'utf8')
      } 
    case 'SafeMath.sol':
      return {
        contents:fs.readFileSync(r(COMPILE_ENV.contractSrc,'safemath.sol'),'utf8')
      }                  
    default:
      return {error:`file ${dependency} not found.`}
  }

}

function compileSources(config) {
  try{
    //console.log(solc.compile(JSON.stringify(config,null,2)))
    return JSON.parse(solc.compile(JSON.stringify(config),getImports))
  }catch(e){
    console.log(chalk.red('Compile Contracts error \n'),e)
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
  //console.log(JSON.stringify(compiled))
  //fs.outputJsonSync(r('build','test.json'),compiled)
  for(let contractFileName in compiled.contracts){
    const contractKeys = Object.keys(compiled.contracts[contractFileName])

    if(contractKeys.length){
      console.log(chalk.red('Compile File '+contractFileName+' list'),'\n')
      console.log(contractKeys.join(','))
    }

    // const contractName = contractFileName.replace('.sol','')


    for(let idx in contractKeys){
      const contractName = contractKeys[idx]

      if(IgnoreLibs.find(it => it === contractName)){
        console.log(chalk.red('ignore lib'+contractName),'\n')
        continue;
      }

      console.log(chalk.green('Writing:'),chalk.yellow(contractName+'.json'))
      //
      NamePairs[contractName] = COMPILE_ENV.es6 ? 
        `import ${contractName} from './${contractName}.json'` : `const ${contractName} = require('./${contractName}.json')`
      //Contracts.push[contractName]

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

      
      // const abi = compiled.contracts[contractFileName][contractName].abi||[] 
      // fs.outputJsonSync(
      //   r(buildPath,`${contractName}.abi`),
      //   [...abi]
      // );   

      // const bytecode = compiled.contracts[contractFileName][contractName].evm.bytecode.object||''
      // const binfile = r(buildPath,`${contractName}.bin`)
      // fs.ensureFileSync(binfile)
      // fs.outputFileSync(binfile,bytecode,{encoding:'utf8'})             
    }
  }
}

/**
 * @DateTime 2020-05-04
 * @return   {[type]}   [description]
 */
function preparedPackageIndex(){
  const indexFile = r(COMPILE_ENV.target,'index.js')
  fs.ensureFileSync(indexFile)
  fs.outputFileSync(indexFile,'',{encoding:'utf8'})

  return indexFile;
}

async function writeIndex(){
  const indexFile = preparedPackageIndex()
  console.log(chalk.green('Writing Index:'),chalk.yellow(JSON.stringify(NamePairs,null,2)))

  await writeImports();
  await writeExport();

  async function writeImports(){
    const keys = Object.keys(NamePairs).sort()

    for(let i in keys){
      const content = NamePairs[keys[i]]

      await fs.appendFile(indexFile,`${content};\n`)
    }
  }

  async function writeExport(){
    const keys = Object.keys(NamePairs).sort()

    const tsTag = stdDateFormat.format(new Date()) 

    await fs.appendFile(indexFile,`\n`,{encoding:'utf8'})
    await fs.appendFile(indexFile,`\/**\n`,{encoding:'utf8'})
    await fs.appendFile(indexFile,` * BAS build at:${tsTag} \n`,{encoding:'utf8'})
    await fs.appendFile(indexFile,` **\/\n`,{encoding:'utf8'})

    if(COMPILE_ENV.es6){
      await fs.appendFile(indexFile,`export default { \n`,{encoding:'utf8'})
    }else{
      await fs.appendFile(indexFile,`module.exports = { \n`,{encoding:'utf8'})
    }
    
    for(let i in keys){
      const content = keys[i]
      await fs.appendFile(indexFile,`  ${content},\n`,{encoding:'utf8'})
    }  

    await fs.appendFile(indexFile,`} \n`,{encoding:'utf8'})
  }
}

//workflow
//
const buildpath = compilingPreperations();
const config = createConfiguration();
const compiled = compileSources(config)

errorHandling(compiled)

writeOutput(compiled,buildpath);

//write index
writeIndex()