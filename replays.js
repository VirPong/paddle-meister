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
var rGames = []; //the list of games client able to replay

/*
  Client connects requesting a game based on its gameID. We send them an array of 
  objects almost identical to the information sent during games so that they can build
  replays easily.
*/

io.sockets.on('connection', function(aClient){

  console.log("Client is connecting to replays.");
  client = new Client(aClient, "guest");
  buildReplayList(); 
  aClient.volatile.emit('games', {names: rGames});  //emit list of games with replays
  
  //Requesting gameID to query on
  aClient.on('watchGame', function(aGameID){
    this.queryReplay(aGameID);
    this.watchGame(aClient);
    //aClient.volatile.emit('replayInfo', { replayInfo: rDocs});
  });

  //Watch from the array - streaming because stored information too large
  watchGame = function(aClient){
    i = 0;
    var replayInterval = setInterval( function(), {
      aClient.volatile.emit('replayInfo', rDocs[i]);
      i = i +1;
      if(i == rDocs.length -1){
        clearInterval(replayInterval);
      }
    }, 100);
  }
  
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

//Helper function to build list of all repayable games
function buildReplayList (){
  db.replays.find({}, {gameID:1}).forEach(function, err, doc) {
    if(doc != null){
      rGames.push(doc.gameID);
    }
  }
}