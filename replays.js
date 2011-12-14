/* Replays.js v.0.2 for Vir-Pong, Inc. */
/* Shelby Lee */

//This is the port that the server listens on. Make sure it
//doesn't conflict with the port that the game server (server.js)
//is running on! Otherwise there will be a plethora of errors.
//
//Remember, you can't run under port 1024 without being root.
var PORT = 3001;

//Interval at which to send packets during replay.
var INTERVAL = 50;

//Require the express framework (which creates a server) 
var app = require('express').createServer();
sys = require(process.binding('natives').util ? 'util' : 'sys')
  sio = require('socket.io');

//sets server to listen, and creates socket.io websocket instance.
app.listen(PORT);
var io = sio.listen(app);
io.set('log level', 1); // reduce logging

//Using mongojs for database connectivity.
var db = require('mongojs').connect('games',['replays']); //db connection

//The games that are currently available.
var rGames = []; //Game list can be global
/*
  Client connects requesting a game based on its gameID. We send them an array of 
  objects almost identical to the information sent during games so that they can build
  replays easily.
  
  @param aClient, the socket.io instance of the client who is connecting.
*/

io.sockets.on('connection', function(aClient){

  console.log("Client is connecting to replays.");

  //Builds the game list and sends it to the client.
  buildReplayList(aClient);
  
  /*
    On watchGame from client
    Client requests a game, and a process is spawned to send them information
    every INTERVAL milliseconds.
    
    @param aGameID, the game ID of the game requested to watch.
  */
  aClient.on('watchGame', function(aGameID){
    console.log("Game ID: " + aGameID.game);
    console.log("Calling queryReplay");
    queryReplay(aClient, aGameID.game, function(aClient, rDocs){
       console.log(rDocs);
       watchGame(aClient, rDocs);
    });
  });

});

/*
  Streams the game data to a client -- we were unable to
  just give the client the data because usually replays are
  around 100MB or so.

  @param aClient the socket.io client to stream to.
  @rDocs the array version of the game data retrieved from mongoDB to transmit.
*/
var watchGame = function(aClient, rDocs){
  i = 0;
  var replayInterval = setInterval( function() {
    aClient.volatile.emit('replayInfo', {docs: rDocs[i]});
    i = i + 1;
    if(i == rDocs.length -1){
      clearInterval(replayInterval);
      aClient.emit('gameEnd');
    }
  }, INTERVAL);
}
  

/*
  Helper function to query database and build player position arrays
  
  @param aClient the socket.io client to send info to.
  @param aGameID, the game ID with which to build the array.
  @param callback the callback method to call when the process is completed.
*/
function queryReplay(aClient, aGameID, callback){
  var rDocs = [];
  console.log("In queryReplay " + aGameID);
  //this query says we're looking for the games that have the same gameID as our argument
  //we're going to leave our the mongodb generated index (_id) and the gameID
  //Then we iterate over them to ensure that we don't accidentally pull something null
  db.replays.find({gameID: Number(aGameID)}).forEach(function(err, doc) {
    console.log("In forEach");
    if(doc != null) {  //ensuring not null
      console.log("In not null, replayDocs.length = " + doc.replayDocs.length);
      for(var i = 0; i < doc.replayDocs.length; i++){
        console.log("In rdocs loop");
        rDocs[i] = doc.replayDocs[i];
        console.log(rDocs[i].ball[0]);
      }
    }
  });
  callback(aClient, rDocs);
  console.log(rDocs[0]);
}

/*
  Builds list of all replayable games.
  
  @param aClient the socket.io client to send the list to.
*/
function buildReplayList (aClient){
  db.replays.find({}, {gameID:1}).forEach(function (err, doc) {
    if(doc != null){
      //Must cast the gameID as a number, otherwise mongo gets angry!
      rGames.push(Number(doc.gameID));
    }
  });
  aClient.volatile.emit('games', {names: rGames});  //emit list of games with replays
}
