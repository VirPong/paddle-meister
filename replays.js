/* Replays.js v.0.2 for Vir-Pong, Inc. */
/* Shelby Lee */

//want to listen on a different port than games
var PORT = 3001;

//var io = require('socket.io').listen(PORT);
var app = require('express').createServer();
sys = require(process.binding('natives').util ? 'util' : 'sys')
  sio = require('socket.io');
var io = sio.listen(app);
var db = require('mongojs').connect('games',['replays']);

//var playerPos = []; //array to hold the player positions, 0 has array of p1pos and 1 p2pos
//var ballPos = []; //array holding ball positions; 0 has x-position, 1 has y-position
var rDocs = []; //the javascript objects pulled from the database

//Connection to client
//We send static game information to the client for them to parse in the same way
//they parse the data we stream out of the server.js
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
  db.replays.find({gameID:aGameID}, {_id:0, gameID:0}).sort().forEach(function(err, doc) {
     //We will assume that the information in the database is in order, because arrays are inserted
    if(doc != null) {  //don't want to run anything if it is null
      
      rDocs.push(doc);
      
      //The database store Javascript objects, we just want to hold onto them and emit them to client
      //playerPos = doc.playersPos;      //the array has entire game positions on it
      //ballPos = doc.ballPos;

      
    }
  });
}
