const chalk       = require("chalk"),
  DateFormat      = require('fast-date-format'),
  fs              = require('fs-extra'),
  path            = require('path'),
  pkgJson         = require('../package.json').version;


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
    gas:web3.utils.toHex(5000000),
    gasPrice:web3.utils.toHex(web3.utils.toWei("10",'gwei'))
  }

  const DeployResult = {
    success:[],
    failure:[]
  }

  const BasToken                = await createContract(ContractsJSON.BasToken.abi,ContractsJSON.BasToken.bytecode,[],'BasToken')

  const BasExpiredOwnership     = await createContract(ContractsJSON.BasExpiredOwnership.abi,ContractsJSON.BasExpiredOwnership.bytecode,['mail'],'BasExpiredOwnership')
  const BasTradableOwnership    = await createContract(ContractsJSON.BasTradableOwnership.abi,ContractsJSON.BasTradableOwnership.bytecode,['domain'],'BasTradableOwnership')

  const BasRootDomain           = await createContract(ContractsJSON.BasRootDomain.abi,ContractsJSON.BasRootDomain.bytecode,[BasTradableOwnership._address],'BasRootDomain')
  const BasSubDomain            = await createContract(ContractsJSON.BasSubDomain.abi,ContractsJSON.BasSubDomain.bytecode,[BasTradableOwnership._address],'BasSubDomain')
  const BasDomainConf           = await createContract(ContractsJSON.BasDomainConf.abi,ContractsJSON.BasDomainConf.bytecode,[BasTradableOwnership._address],'BasDomainConf')

  const BasAccountant           = await createContract(ContractsJSON.BasAccountant.abi,ContractsJSON.BasAccountant.bytecode,[],'BasAccountant')
  const BasMiner                = await createContract(ContractsJSON.BasMiner.abi,ContractsJSON.BasMiner.bytecode,[BasToken._address,BasAccountant._address],'BasMiner')
  const BasOANN                 = await createContract(ContractsJSON.BasOANN.abi,ContractsJSON.BasOANN.bytecode,[BasToken._address,BasRootDomain._address,BasSubDomain._address,BasAccountant._address],'BasOANN')

  const BasMarket               = await createContract(ContractsJSON.BasMarket.abi,ContractsJSON.BasMarket.bytecode,[BasToken._address,BasRootDomain._address,BasSubDomain._address],'BasMarket')

  const BasMail                 = await createContract(ContractsJSON.BasMail.abi,ContractsJSON.BasMail.bytecode,[BasExpiredOwnership._address],'BasMail')
  const BasMailManager          = await createContract(ContractsJSON.BasMailManager.abi,ContractsJSON.BasMailManager.bytecode,[BasToken._address,BasAccountant._address,BasRootDomain._address,BasSubDomain._address,BasMail._address],'BasMailManager')

  const BasView                 = await createContract(ContractsJSON.BasView.abi,ContractsJSON.BasView.bytecode,[],'BasView')

  //writing package
  await buildDeployedPackage();


  /* link data */
  await BasView.methods.setAddresses(
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
  ).send(Options)


  await linkDataKeeper(BasTradableOwnership, BasRootDomain, Options);
  await linkDataKeeper(BasTradableOwnership, BasSubDomain, Options);
  await linkDataKeeper(BasTradableOwnership, BasMarket, Options); 
  await linkDataKeeper(BasRootDomain, BasOANN, Options);
  await linkDataKeeper(BasSubDomain, BasOANN, Options);
  await linkDataKeeper(BasAccountant, BasOANN, Options);
  await linkDataKeeper(BasAccountant, BasMailManager, Options);
  await linkDataKeeper(BasMiner, BasAccountant, Options);
  await linkDataKeeper(BasMail, BasMailManager, Options);
  await linkDataKeeper(BasExpiredOwnership, BasMail, Options);

  await BasAccountant.methods.registerContractReceiver("miner", BasMiner._address).send(Options);  


  async function createContract(abi,bin,args,contractName) {
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
      fs.outputJsonSync(
        r(distPath,`${name}.json`),
        abiJsons[i],
        {
          spaces:2,
          EOL:'\n'
        }        
      )
    }

    generatePackageIndex(abiJsons,distPath)
  }

  function preparedDistDir(){
    const distPath = r(deployedDist)
    fs.removeSync(distPath)
    return distPath
  }

  async function generatePackageIndex(abiJsons,distPath){

    const indexfile = r(distPath,'index.js')
    const buildAtTime = stdDateFormat.format(new Date())

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