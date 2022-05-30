import Web3 from "web3";
import { createRequire } from "module";
const require = createRequire(import.meta.url); 
const dotenv = require('dotenv');

dotenv.config();
let HDWalletProvider = require("truffle-hdwallet-provider");
const getWeb3 = () =>
  new Promise((resolve, reject) => {

        const provider = new HDWalletProvider(//Creates the wallet connection using the private key of a valid wallet to sign the transactions to call the smart contract's functions
                                              //and the key of the gateway API which connects us to blockchain we want to use 
          process.env.PRIVATE_KEY, 
          process.env.INFURA_API
        );
        const web3 = new Web3(provider);//using the provider we connect to Web3, this allow the code to interact with the blockchain
        resolve(web3);  
  });

export default getWeb3;
