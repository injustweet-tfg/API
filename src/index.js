import getWeb3 from "./getWeb3.js";//Import web3 for the connections with the smart contract we have done
import { create } from 'ipfs-http-client'//Import the create function from the api ipfs-hhtp-client to connect to the ipfs
import { createRequire } from "module";//Import the require to use other module types
const require = createRequire(import.meta.url); 
const express = require('express');//Import express.js to create the API
const bodyParser = require('body-parser');//Import the bodyParser to control the data type received from the POST method
const { TwitterApi } = require('twitter-api-v2');//Import the Twitter Api module to update the data stored on IPFS


const app = express();//Creates the API
const client = create('https://ipfs.infura.io:5001/api/v0')//Create a connection to the ipfs gate called infura
const compiledStorage = require('./contracts/SimpleStorage2.json'); //Imports the JSON ABI of the smart contract we are using

const twApi = new TwitterApi(process.env.TWITTER_API);//Create a connection to the Twitter API using a bearer token

const web3 = await getWeb3();//Calls the code that connects to Web3 
const accounts = await web3.eth.getAccounts();
const contract = await new web3.eth.Contract(compiledStorage,'0xD80DF6E95F5b6a58b253b4f1aCB036aa71Be0092');//Connects to the smart contract by passing the JSON ABI to Web3

//update auxiliar lets
let filePos=0;//To know the file is being updated
let tweetPos=0;//To store the last checked tweet  
let consultedTweets=0;//To check how many tweets has Twitter API checked (because we have a limit of tweets per time)
let twitterLimit=20;//This is to not exceed the Twitter API limit imposed on our account 

app.get('/', async (req,res) => {//A basic main method with a simple return, this is the root path of this API 
  
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Headers', "*");
    res.json({page: 'main'});
});


app.get('/get', async (req,res) => {//This method returns a JSON with the information of the updated tweets stored on IPFS and the SmartContract
  
  //Connects to the smart contract and returns a struct with the IPFS hash and an array with the valid tweets that IPFS contains
  let valor= await contract.methods.getFiles().call();

  let str =``;
  
  //for each IPFS hash we download the file content
  for(let k=0;k<valor.length;k++){

    let strFile = ``;

    const chunks = [] 
    for await (const chunk of client.cat(valor[k].IPFShash)) {//Connects to IPFS and downloads the information chunks to recover the data
      chunks.push(chunk)
    }

    //Stringify the data from IPFS to be legible
    for(let i=0;i<chunks.length;i++){
      strFile += chunks[i].toString();
    }
        
    
    let ok = false;//To remove outdated data from the response
    let pos = 0;//The position of the current tweet we are analyzing to include on the response
    let validTweets = JSON.parse(strFile);

    for(let i = 0; i < validTweets.length; i++) {//This for goes through the tweets stored on this file
      let obj = validTweets[i];
      ok = false;

      for(let j=0;j<valor[k].tweetID.length;j++){             
        if(!ok && obj["id"]==valor[k].tweetID[j]){//Checks that this tweet is updated
          ok = true;
        }
      }

      if(!ok){//If the tweet is outdated we remove it from the response
        validTweets.splice(pos,1);
        pos--;
      }
      pos++;
    };

    let aux = ``;
    aux += JSON.stringify(validTweets);

    //To sanitise the response and avoid formatting errors we add or delete some special characters like "," "[" or "]"
    if(k==0){
      if(k != valor.length-1){
        aux = aux.slice(0, aux.length -1);
        aux+=`,`;
      }
    }else if(k == valor.length-1){
      aux = aux.slice(1);
    }else{
      aux = aux.slice(0, aux.length -1)
      aux = aux.slice(1);
      aux+=`,`;
    }

    str += aux;

  }
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Headers', "*");
    res.json(str);//Sends the response to the client
});




app.use(bodyParser.json())
app.post('/set', async (req,res) => {

  let idArray = [];

  req.body.forEach(obj => {//Collects the tweet ID's 
    idArray.push(obj["id"].toString());
  });

  //Store the tweets in IPFS and gets the IPFS hash
  const added = await client.add(JSON.stringify(req.body));

  //Sends the file IPFS hash with the tweet ID's it contains to de smart contract
  await contract.methods.setFile(added.path, idArray).send({
    from:'0x0fe2273f4754f494d3fe0C6D8cB5aE83f2b64bF9'});
    
  res.json({});//Close the connection
});



app.get('/update', async (req,res) => {
  //Connects to the smart contract and returns a struct with the IPFS hash and an array with the valid tweets that IPFS contains
  let valor= await contract.methods.getFiles().call();
  let tweetsUpdated = [];//Contains the information of the tweets that need to be updated
  let tweetsUpdatedId = [];//Contains the tweet ID's of the tweets are going to be updated
  //for each IPFS hash we check all the tweets as far as the Twitter API allow us
  for(let k=filePos;k<valor.length && consultedTweets<twitterLimit;k++){
  
    let strFile = ``;

    const chunks = [] 
    for await (const chunk of client.cat(valor[k].IPFShash)) {//Connects to IPFS and downloads the information chunks to recover the data
      chunks.push(chunk)
    }
  
    //Stringify the data from IPFS to be able to manipulate this data
    for(let i=0;i<chunks.length;i++){
      strFile += chunks[i].toString();
    }
        
    let ok = false;
    let validTweets = JSON.parse(strFile);
    let auxPos = 0;
    if(valor[k].tweetID.length>0){
    validTweets.forEach(async obj => {
  
      if(auxPos>=tweetPos && consultedTweets<twitterLimit){
        ok = false;      
        for(let j=0;j<valor[k].tweetID.length;j++){             
          if(!ok && obj["id"]==valor[k].tweetID[j]){//This check if the tweet is the last version we have stored of the tweet or is outdated data
            ok = true;
          }
        }
    
        if(ok){//We only update the last version of each tweet
          try{
            const tweetsUpd = await twApi.v2.tweets(obj["id"], {//Gets the public metrics of this tweet (this is the information that can change with time)
              'tweet.fields': 'public_metrics'
            });
            consultedTweets++;

            if(!tweetsUpd.hasOwnProperty('errors')){//This checks if check if the tweet has not been deleted
              
              let tweet = tweetsUpd.data[0].public_metrics;

              //Updates the data if needed
              if(tweet.retweet_count!==obj["retweets"] || tweet.reply_count!==obj["replies"] || tweet.like_count!==obj["likes"]){
                obj["retweets"] = tweet.retweet_count;
                obj["replies"] = tweet.reply_count;
                obj["likes"] = tweet.like_count;
                
                tweetsUpdated.push(obj);
                tweetsUpdatedId.push(obj["id"]);
              }

            }
          }catch(error1){

          }   
        }
        tweetPos++;
      }
      auxPos++;
    });
    }
    if(tweetPos%validTweets.length==0){//Update the code variables to change the file we are looking at
      filePos++;
      filePos=filePos%(valor.length);
      tweetPos = 0; 
    }
  }
  consultedTweets =0;
  
  if(tweetsUpdatedId.length>0){//If any tweet has been updated

    //Store the tweets in IPFS and gets the IPFS hash
    const updatedAdded = await client.add(JSON.stringify(tweetsUpdated));
    try{
    //Sends the file IPFS hash with the tweet ID's it contains to de smart contract
    await contract.methods.updateTweets(updatedAdded.path, tweetsUpdatedId).send({
      from:'0x0fe2273f4754f494d3fe0C6D8cB5aE83f2b64bF9'});
      
    }
    catch(error){
    }
  
  }
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Headers', "*");
  
    res.json({});//Close the connection with the client
  
  });
      
app.listen(process.env.PORT,() => console.log(`Server started`));//Express.js funtion to set the port of the API REST