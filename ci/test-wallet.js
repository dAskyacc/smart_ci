const Buffer      = require('safe-buffer').Buffer,
  chalk           = require("chalk"),
  DateFormat      = require('fast-date-format'),
  ethereumUtil    = require('ethereumjs-util'),
  fs              = require('fs-extra'),

  path            = require('path');

const ganache     = require('ganache-cli');
const  Wallet  = require('ethereumjs-wallet');


const private = '0x53D33755DF150E1E9297C26E4893CA8469EA8AFA8C185524F1DBBF14BD7EF3E2'

const wallet = Wallet.fromPrivateKey(Buffer.from(private, 'hex'))

console.log(wallet.getAddressString())
