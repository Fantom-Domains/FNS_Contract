const hre = require("hardhat");
const namehash = require('eth-ens-namehash');
const packet = require('dns-packet');
const crypto = require ('crypto')

const ethers = hre.ethers;
const utils = ethers.utils;
const fs = require('fs')
const labelhash = (label) => utils.keccak256(utils.toUtf8Bytes(label))
const jsonData = require('../reservation.json');
const envfile = require('envfile')
const parsedFile = envfile.parse(fs.readFileSync('./.env'))


const delay = async (ms) => new Promise(resolve => setTimeout(resolve, ms))

function web3StringToBytes32(text) {
    var result = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(text));
    while (result.length < 66) { result += '0'; }
    if (result.length !== 66) { throw new Error("invalid web3 implicit bytes32"); }
    return result;
}

async function main() {
  // console.log("parsedFile",parsedFile["FTMRegistrarController_ADDRESS"])
  // const ENSRegistry = await ethers.getContractAt("FNSRegistry","0xC000f5161A12f0a300B2c7FB6F562a6226C0DDa6")
  // const PublicResolver = await ethers.getContractAt("PublicResolver","0x6F85Dbf9607567862F8A8cC5E3406b34E2acc36a")
  // const ReverseRegistrar = await ethers.getContractAt("ReverseRegistrar","0x80daFB85B37b767bF62eDd24dd9B592d1d2Beb43")
  // const BaseRegistrar = await ethers.getContractAt("BaseRegistrarImplementation","0xE8F09aF00435BC821f86A70098a9907240fb9978")
  const ETHRegistrarController = await ethers.getContractAt("FTMRegistrarController",parsedFile["FTMRegistrarController_ADDRESS"])
  
  
  const duration = 31556952
  
  const transactions_commit = [];
  const transactions_register = [];
  const resolverAddr = "0x6F85Dbf9607567862F8A8cC5E3406b34E2acc36a"
  await Promise.all(jsonData.map(async (tx)=>{
	  console.log(`Generating commit for (account:${tx.account}, fns:${tx.fns}.ftm)...`);
	  const commitment = await ETHRegistrarController.makeCommitmentWithConfig(tx.fns,tx.account,web3StringToBytes32(''),resolverAddr,tx.account);
	  await ETHRegistrarController.commit(commitment)
	  console.log('commitment',commitment)
	  
  }))
  
  // jsonData.map(async (tx)=>{
	  // console.log(`Generating commit for (account:${tx.account}, fns:${tx.fns}.ftm)...`);
	  // const commitment = await ETHRegistrarController.makeCommitmentWithConfig(tx.fns,tx.account,'',resolverAddr,tx.account);
	  // await ETHRegistrarController.commit(commitment)
  // })
  await delay(120000)
  
  
  await Promise.all(jsonData.map(async (tx)=>{
	  const commitment = await ETHRegistrarController.makeCommitmentWithConfig(tx.fns,tx.account,web3StringToBytes32(''),resolverAddr,tx.account);
	  const timestamp = await ETHRegistrarController.commitments(commitment)
	  if(timestamp){
		  const secret = '0x' + crypto.randomBytes(32).toString('hex');
		  const price = await ETHRegistrarController.rentPrice(tx.fns, duration)
		  const bufferprice = price.mul(110).div(100)
		  const gasLimitHex = await ETHRegistrarController.estimateGas.registerWithConfig(tx.fns,tx.account,web3StringToBytes32(secret),resolverAddr,tx.account,{ value: bufferprice})
		  const gasLimit = gasLimitHex.toNumber()
		  await ETHRegistrarController.registerWithConfig(tx.fns,tx.account,web3StringToBytes32(secret),resolverAddr,tx.account,{ value: bufferprice, gasLimit });
		  console.log(`Registered for (account:${tx.account}, fns:${tx.fns}.ftm)...`);
	  }
	  
  }))
  
  // jsonData.map(async (tx)=>{
	  // const commitment = await ETHRegistrarController.makeCommitmentWithConfig(tx.fns,tx.account,'',resolverAddr,tx.account);
	  // const timestamp = await ETHRegistrarController.commitments(commitment)
	  // if(timestamp){
		  // const secret = '0x' + crypto.randomBytes(32).toString('hex');
		  // const price = await ETHRegistrarController.getRentPrice(label, duration)
		  // const bufferprice = price.mul(110).div(100)
		  // const gasLimitHex = await ETHRegistrarController.estimateGas.registerWithConfig(name,owner,secret,resolverAddr,account,{ value: bufferprice})
		  // const gasLimit = gasLimitHex.toNumber()
		  // await ETHRegistrarController.registerWithConfig(name,owner,secret,resolverAddr,account,{ value: bufferprice, gasLimit });
		  // console.log(`Registered for (account:${tx.account}, fns:${tx.fns}.ftm)...`);
	  // }
  // })

};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });