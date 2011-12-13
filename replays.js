/* Replays.js v.0.2 for Vir-Pong, Inc. */
/* Shelby Lee */

//listening on a port different than games
var PORT = 3001;

var app = require('express').createServer();
sys = require(process.binding('natives').util ? 'util' : 'sys')
  sio = require('socket.io');

app.listen(PORT);
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
  buildReplayList(); 
  aClient.volatile.emit('games', {names: rGames});  //emit list of games with replays
  
  //Requesting gameID to query on
  aClient.on('watchGame', function(aGameID){
    console.log("Game ID: " + aGameID.game);
    console.log("Calling queryReplay");
    queryReplay(aGameID.game);
    watchGame(aClient);
    //aClient.volatile.emit('replayInfo', { replayInfo: rDocs});
  });

  //Watch from the array - streaming because stored information too large
  var watchGame = function(aClient){
    i = 0;
    var replayInterval = setInterval( function() {
      aClient.volatile.emit('replayInfo', {docs: rDocs[i]});
      i = i +1;
      if(i == rDocs.length -1){
        clearInterval(replayInterval);
        aClient.emit('gameEnd');
      }
    }, 50);
  }
  
});


//Helper function to query database and build player position arrays
function queryReplay(aGameID){
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
  console.log(rDocs[0]);
}

//Helper function to build list of all repayable games
function buildReplayList (){
  db.replays.find({}, {gameID:1}).forEach(function (err, doc) {
    if(doc != null){
      rGames.push(doc.gameID);
    }
  });
}
