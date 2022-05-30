# API
Here can be found the files related to the API and the connections it has, like web3, Solidity smart contract, IPFS or Twitter.
### CODE


- [src:](https://github.com/injustweet-tfg/API/tree/main/src/)         Directory with the main code of the API rest proyect.

- [getWeb3.js:](https://github.com/injustweet-tfg/API/tree/main/src/getWeb3.js)         File where the configuration of the wallet and the connections to the blockchain are made. 

- [index.js:](https://github.com/injustweet-tfg/API/tree/main/src/index.js)         Main file of the API. The top creates the API with express.js and the connetions to IPFS and Twitter API. Then, four API funtions are declared.
  - The root "/" : is a simple GET to control that no one calls a method unintentionally.
  - The "/get": returns all the updated tweets stored in IPFS by this API by getting a IPFS hash array and downloading all the files from IPFS with the tweet information and removing the outdated data.
  - The "/set": stores the incomming JSON array in IPFS and sends the resultant IPFS hash with the tweet IDs to a smart contract.
  - The "/update": is a GET method, so when it is called this function updates a batch of tweets, the number of the tweets that can be updated is set by the Twitter API. To update all valid stored tweets, this function must be called more the once.

- [contracts:](https://github.com/injustweet-tfg/API/tree/main/src/contracts)         Directory with the JSON ABI this API uses from a Soidity smart contract.

- [SimpleStorage2.json:](https://github.com/injustweet-tfg/API/tree/main/src/contracts/SimpleStorage2.json)         JSON File which contains the JSON ABI of the main Solidity smart contract used by this API. Here the information of the funtions and variables from the contract can be found, like name, type, inputs or outpust if it is a function, and other data as visibility (public, private, external or internal), or other states like view, pure or payable.
