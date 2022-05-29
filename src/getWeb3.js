import Web3 from "web3";
import { createRequire } from "module";
const require = createRequire(import.meta.url); 
const dotenv = require('dotenv');

dotenv.config();
let HDWalletProvider = require("truffle-hdwallet-provider");
const getWeb3 = () =>
  new Promise((resolve, reject) => {

        const provider = new HDWalletProvider(
          process.env.PRIVATE_KEY, 
          process.env.INFURA_API
        );
        const web3 = new Web3(provider);
        resolve(web3);  
  });

export default getWeb3;