/**
 * [chalk description]
 * @type {[type]}
 */

const chalk       = require("chalk"),
  DateFormat      = require('fast-date-format'),
  ethereumUtil    = require('ethereumjs-util'),
  fs              = require('fs-extra'),
  path            = require('path');

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

const options = {
  port:envArgs.PORT||7545,
  network_id:envArgs.CHAIN_ID||1337,
  db_path:r('build','db'),
}


function deleteGanacheDB(){
  const DBPath = r('build','db')

  fs.remove(DBPath).then(()=>{
    console.log(chalk.blue(`Delete Ganache DB :${DBPath} success.`))
  }).catch(err=>{
    console.log(chalk.red('Remove Ganache DB fail: \n'),err)
  })
}


//execute flow
deleteGanacheDB()