/* Replays.js v.0.2 for Vir-Pong, Inc. */
/* Shelby Lee */

//listening on a port different than games
var PORT = 3001;

var app = require('express').createServer();
sys = require(process.binding('natives').util ? 'util' : 'sys')
  sio = require('socket.io');
var io = sio.listen(app);
var db = require('mongojs').connect('games',['replays']); //db connection

var rDocs = []; //the javascript object pulled from the database

/*
  Client connects requesting a game based on its gameID. We send them an array of 
  objects almost identical to the information sent during games so that they can build
  replays easily.
*/

io.sockets.on('connection', function(aClient){

  console.log("Client is connecting to replays.");
  client = new Client(aClient, "guest");
  //client.socket.emit('getting stuff'); //test emission
  
  //Requesting gameID to query on
  aClient.on('watchGame', function(aGameID){
    this.queryReplay(aGameID);
    aClient.volatile.emit('replayInfo', { replayInfo: rDocs});
  });
  
}


//Helper function to query database and build player position arrays
function queryReplay(aGameID){
  //this query says we're looking for the games that have the same gameID as our argument
  //we're going to leave our the mongodb generated index (_id) and the gameID
  //Then we iterate over them to ensure that we don't accidentally pull something null
  db.replays.find({gameID:aGameID}, {_id:0, gameID:0}).forEach(function(err, doc) {
    if(doc != null) {  //ensuring not null
      rDocs = doc;
    }
  });
}
