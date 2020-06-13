const chalk       = require("chalk"),
  DateFormat      = require('fast-date-format'),
  fs              = require('fs-extra'),
  path            = require('path'),
  pkgJson         = require('../package.json').version;

const LOCAL_ADDRESSES = "ganache-address.js";

const Web3 = require('web3')
const ContractsJSON =require('../build/contracts')

const r = (...p) => path.resolve(__dirname,'../',...p)
const stdDateFormat = new DateFormat('YYYY-MM-DD HH:mm:ss');

const dotEnv = require('dotenv').config({
  path:r('.env'),
  encoding:'utf8'
})

if(dotEnv.error){
  console.log(chalk.red('Load env error.'),dotEnv.error)
  process.exit(1)
}

const envArgs = dotEnv.parsed
const port = envArgs.PORT||7545

const version = envArgs.VERSION || pkgJson.version 
const author = envArgs.AUTHOR || pkgJson.author

const deployedDist = envArgs.DEPLOYED_DIST||'dist/contracts'

const web3 = new Web3(`http://127.0.0.1:${port}`)

const Deployed = async ()=>{
  const accounts                = await web3.eth.getAccounts()
  const wallet                  = accounts[0]
  const chainId                 = await web3.eth.getChainId()

  //log
  console.log(wallet,chainId)
  const logFile = r('dist','deploy-contract.log')
  preparedLog(logFile,chainId,wallet);

  const Options                 = {
    from:wallet,
    gas:web3.utils.toHex(50000000),
    gasPrice:web3.utils.toHex(web3.utils.toWei("10",'gwei'))
  }

  const DeployResult = {
    success:[],
    failure:[]
  }

  // try{


    const BasToken                = await createContract(ContractsJSON.BasToken.abi,ContractsJSON.BasToken.bytecode,[],'BasToken')
    
    const BasRelations            = await createContract(ContractsJSON.BasRelations.abi,ContractsJSON.BasRelations.bytecode,["0x0000000000000000000000000000000000000000"],'BasRelations')  

    const BasExpiredOwnership     = await createContract(ContractsJSON.BasExpiredOwnership.abi,ContractsJSON.BasExpiredOwnership.bytecode,[BasRelations._address],'BasExpiredOwnership')
    const BasTradableOwnership    = await createContract(ContractsJSON.BasTradableOwnership.abi,ContractsJSON.BasTradableOwnership.bytecode,[BasRelations._address],'BasTradableOwnership')

    const BasRootDomain           = await createContract(ContractsJSON.BasRootDomain.abi,ContractsJSON.BasRootDomain.bytecode,[BasRelations._address],'BasRootDomain')
    const BasSubDomain            = await createContract(ContractsJSON.BasSubDomain.abi,ContractsJSON.BasSubDomain.bytecode,[BasRelations._address],'BasSubDomain')
    const BasDomainConf           = await createContract(ContractsJSON.BasDomainConf.abi,ContractsJSON.BasDomainConf.bytecode,[BasRelations._address],'BasDomainConf')

    const BasAccountant           = await createContract(ContractsJSON.BasAccountant.abi,ContractsJSON.BasAccountant.bytecode,[BasRelations._address],'BasAccountant')
    const BasMiner                = await createContract(ContractsJSON.BasMiner.abi,ContractsJSON.BasMiner.bytecode,[BasRelations._address],'BasMiner')
    const BasOANN                 = await createContract(ContractsJSON.BasOANN.abi,ContractsJSON.BasOANN.bytecode,[BasRelations._address],'BasOANN')

    const BasMarket               = await createContract(ContractsJSON.BasMarket.abi,ContractsJSON.BasMarket.bytecode,[BasRelations._address],'BasMarket')

    const BasMail                 = await createContract(ContractsJSON.BasMail.abi,ContractsJSON.BasMail.bytecode,[BasRelations._address],'BasMail')
    const BasMailManager          = await createContract(ContractsJSON.BasMailManager.abi,ContractsJSON.BasMailManager.bytecode,[BasRelations._address],'BasMailManager')

    const BasView                 = await createContract(ContractsJSON.BasView.abi,ContractsJSON.BasView.bytecode,[BasRelations._address],'BasView')


    // link contract
    await BasRelations.methods.setAddresses(
      BasToken._address,
      BasExpiredOwnership._address,
      BasTradableOwnership._address,
      BasRootDomain._address,
      BasSubDomain._address,
      BasDomainConf._address,
      BasAccountant._address,
      BasMiner._address,
      BasOANN._address,
      BasMarket._address,
      BasMail._address,
      BasMailManager._address
    ).send(Options);

    // //
    //await BasAccountant.methods.registerContractReceiver("miner", BasMiner._address).send(Options);  

    //writing package
    await buildDeployedPackage();
  // }catch(ex){
  //   console.error(ex)
  // }




  async function createContract(abi,bin,args,contractName) {
    //console.log('abi',abi,'bin',bin)
    let opts = Object.assign({},Options)

    let deploy_contract = await new web3.eth.Contract(abi,opts);
    //console.log(deployContract)
    const payload = {
      data:`0x${bin}`,
      arguments:args
    }

    let inst = await deploy_contract.deploy(payload).send(opts,(err,txhash) =>{
      if(err){
        console.log(chalk.red('Deploy fail'),err)
      }else{
        console.log(chalk.green('Deploy txhash'),txhash)
      }
    })

    if(inst.options.address){
      console.log(contractName,inst.options.address)

      const newJson = {
        contractName,
        abi,
        bytecode:`0x${bin}`,
        networks:{}
      }

      newJson.networks[chainId] = {address:inst.options.address}

      DeployResult.success.push(newJson) 

      //Log 
         
      await appendlog(logFile,contractName,inst.options.address) 
    }

    return inst;
  }

  async function linkDataKeeper(store,keeper,options) {
    return store.methods.addDataKeeper(keeper._address).send(options)
  }

  async function buildDeployedPackage(){

    const abiJsons = DeployResult.success

    const distPath = preparedDistDir()
    fs.ensureDirSync(distPath)


    if(!abiJsons|| !abiJsons.length)return;

    for(let i = 0;i<abiJsons.length;i++){
      const name = abiJsons[i].contractName
      console.log(chalk.yellow(`Writing ${name} Json`))
      //console.log(chalk.yellow(`Writing  Json`,abiStr))
      fs.outputJsonSync(
        r(distPath,`${name}.json`),
        abiJsons[i],
        {
          spaces:2,
          EOL:'\n'
        }        
      )

    }

    // fs.outputFileSync(
    //   ganacheJsonPath,
    //   JSON.stringify(GanacheJson),
    //   'utf8'      
    // )

    generatePackageIndex(abiJsons,distPath);
    generaGanacheABIS(abiJsons);
    generateGanacheAddress(abiJsons,distPath)
  }

  async function generaGanacheABIS(abiJsons){
    const abisFilePath = preparedABIDistJSFile()
    fs.ensureFileSync(abisFilePath)


    if(!abiJsons|| !abiJsons.length)return;
    const len = abiJsons.length;
    const buildAtTime = stdDateFormat.format(new Date())
    //begin
    //comments 
    const comments = '/**\n' +
                      ` * Smart_Contract ${version} \n`+
                      ` * Build Time : ${buildAtTime} \n` +
                      ` * BasChain.org \n` +
                      ' */\n';

    fs.outputFileSync(abisFilePath,comments,{encoding:'utf8'})

    const suffix = 'Json'
    for(let k=0;k<len;k++){
      const name = abiJsons[k]["contractName"]

      if(abiJsons[k]["abi"] && abiJsons[k]["abi"]){
        const abiJsonStr = JSON.stringify(abiJsons[k]["abi"])

        const appendLine = `const ${name}${suffix} = ` + abiJsonStr +';\n'

        await fs.appendFile(abisFilePath,appendLine,{encoding:'utf8'})
      }
    }

    await fs.appendFile(abisFilePath,'//end',{encoding:'utf8'})

  
  }

  async function generateGanacheAddress(abiJsons,distPath){
    const ganacheFile = r(distPath,'ganache.json')

    fs.ensureFileSync(ganacheFile)

    if(!abiJsons|| !abiJsons.length)return;

    let jsonObj = {}
    const len = abiJsons.length;
    for(let k=0;k<len;k++){
      const name = abiJsons[k]["contractName"]
      if(abiJsons[k]["networks"] && abiJsons[k]["networks"]["1337"]){
        const addr = abiJsons[k]["networks"]["1337"]["address"]

        if(addr)jsonObj[name] = {1337:addr}
      }
    }

    fs.outputJsonSync(
      ganacheFile,
      jsonObj,
      {
        spaces:2,
        EOL:'\n'
      }        
    )
  }





  function preparedDistDir(){
    const distPath = r(deployedDist)
    fs.removeSync(distPath)
    return distPath
  }

  function preparedABIDistDir(){
    const distABIS = r('dist/abis')
    fs.removeSync(distABIS)
    return distABIS
  }

  function preparedABIDistJSFile(){
    const distJsABIs = r('dist/abis/all.js')
    fs.removeSync(distJsABIs)
    return distJsABIs
  }

  async function generateABIs(abisJsons,distPath){
    const suffix = "Json"

    const len = abisJsons.length

    for(let i = 0 ;i<len;i++){
      //const name 
    }
  }

  async function generatePackageIndex(abiJsons,distPath){

    const indexfile = r(distPath,'index.js')
    const buildAtTime = stdDateFormat.format(new Date())

    const localAddresses = r(distPath,'ganache.json')

    fs.ensureFileSync(indexfile)


    const comments  = ''+
                      '/** \n' +
                      ` * BAS smart_contract ${version} \n` +
                      ` * Build at: ${buildAtTime} \n` +
                      ` * Author: ${author} \n` + 
                      ' */ \n';

    fs.outputFileSync(indexfile,comments,{encoding:'utf8'})
    await fs.appendFile(indexfile,'\n',{encoding:'utf8'})

    for(let k=0;k<abiJsons.length;k++){
      const name = abiJsons[k]["contractName"]
      const appendLine = `import ${name} from './${name}.json';\n`
      await fs.appendFile(indexfile,appendLine,{encoding:'utf8'})
    }

    //export 
    await fs.appendFile(indexfile,'\n',{encoding:'utf8'})

    await fs.appendFile(indexfile,'export default {\n',{encoding:'utf8'})
    for(let j=0;j<abiJsons.length;j++){
      const name = abiJsons[j]["contractName"]
      const appendName = `  ${name},\n`
      await fs.appendFile(indexfile,appendName,{encoding:'utf8'})
    }
    await fs.appendFile(indexfile,'}\n',{encoding:'utf8'})
  }



  function preparedLog(logfile,chainId,address){
    const ts = stdDateFormat.format(new Date())
    fs.ensureFileSync(logfile)

    const contents  = '# ================================================ \n' +
                      `# Deployed at ${ts} \n`+
                      `# ================================================ \n` +
                      '\n' +
                      `ChainId: ${chainId} \n` +
                      `Account Address:${address} \n` +
                      '\n\n\n'

    fs.outputFileSync(logfile,contents,{encoding:'utf8'})
  }

  async function appendlog(logfile,contractName,address){

    const contents  = '\n# ************************************************* \n' +
                      `Contract ${contractName} deployed. \n` +
                      `  ${address} \n`
    await fs.appendFile(logfile,contents,{encoding:'utf8'})
  }


};

Deployed();