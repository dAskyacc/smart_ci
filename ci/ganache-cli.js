/* =============================================== */
/* Ganache Cli                                     */
/* =============================================== */

const chalk       = require("chalk"),
  DateFormat      = require('fast-date-format'),
  ethereumUtil    = require('ethereumjs-util'),
  fs              = require('fs-extra'),
  path            = require('path');

const ganache     = require('ganache-cli');
const Wallet   = require('ethereumjs-wallet');


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
const DEF_BALANCE_HEX="200000000000000000000"

function getAccounts(){
  const accs = []
  const PRI_KEYS = envArgs.ACC_PRI_KEYS
  if(!PRI_KEYS ||!PRI_KEYS.split(',').length)return accs;
  let accounts = PRI_KEYS.split(',').map(it =>{
    it = {
      secretKey:it,
      balance:DEF_BALANCE_HEX
    }

    return it
  })
  //console.log(JSON.stringify(accounts,null,2))
  return accounts
}

function getUnlockedAccounts(){
  const ACC_STRS = envArgs.ACC_ADDRESSES

  if(!ACC_STRS || !ACC_STRS.split(',').length)return []

  return ACC_STRS.split(',')
}

const options = {
  port:envArgs.PORT||7545,
  network_id:envArgs.CHAIN_ID||1337,
  db_path:r('build','db'),
  //default_balance_ether:200000000000000,
  accounts:getAccounts(),
  //unlocked_accounts:getUnlockedAccounts()
}


/* Server */
const server    = ganache.server(options);

server.listen(options.port,function(err,blockchain){
  if(!err){
    log(blockchain)
    console.log(chalk.red('Local Cli start completed.'),chalk.green(`listen on ${options.port}`))
    //console.log(blockchain)
  }else{
    console.log(chalk.red('Server start fail:'),err)
  }
})



function log(blockchain){
  //console.log(blockchain)

  const ts = stdDateFormat.format(new Date())
  //const logJson = Object.assign({},JSON.parse(blockchain),{'ganacheStartTime':ts})
  const logfile = r('build','ganache-cli.log')
  fs.removeSync(logfile)
  fs.ensureFileSync(logfile)
  fs.outputFileSync(logfile,`Ganache Cli start at:${ts} \n`,{encoding:'utf8'})
  fs.appendFile(logfile,`\n`,{encoding:'utf8'})

  const priKeys = envArgs.ACC_PRI_KEYS ? envArgs.ACC_PRI_KEYS.split(',') : []
  for(let i=0;i<priKeys.length;i++){
    const wallet = Wallet.fromPrivateKey(ethereumUtil.toBuffer(priKeys[i]))
    const address = wallet.getAddressString()
    console.log(chalk.red(`Wallet ${i} :`),chalk.green(address))
    fs.appendFile(logfile,`Wallet ${i}: ${address} \n`,{encoding:'utf8'})
  }

}