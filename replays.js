/*
 * Replays.js for VirPong, Inc.
 * 
 * Replays.js allows clients to view VirPong games that have been saved to a mongodb
 * repository. Games are currently selected via a game list emitted to the client consisting
 * of gameIDs.
 * 
 * Version 0.2 is proof of concept.
 * 
 * @author Shelby Lee, Dan Guilak
 * @version 0.2
 */

//listening on a port different than games
var PORT = 3001;

var app = require('express').createServer();
sys = require(process.binding('natives').util ? 'util' : 'sys')
  sio = require('socket.io');

app.listen(PORT);
var io = sio.listen(app);
io.set('log level', 1); // reduce logging
var db = require('mongojs').connect('games',['replays']); //db connection

var rGames = []; //Game list can be global


/*
 *
 * Gets called whenever someone connects to the server.
 *
 * @param eventName='connection', function(aClient)
 * aClient is the reference to the client's socket.io socket.
 *
 */
io.sockets.on('connection', function(aClient){

  buildReplayList(aClient); //emit game list to client
  
  /*
   * On request to watch game from client
   * 
   * @param eventName='watchGame', function(aGameID)
   * aGameID is a string of numbers unique to a saved game
   *  
   */
  aClient.on('watchGame', function(aGameID){
    queryReplay(aClient, aGameID.game, function(aClient, rDocs){
       watchGame(aClient, rDocs);  //emit game to client
    });
  });

});

/*
 * A helper function to be called to emit information to client
 * Uses setInterval to stream game data packets 
 *
 * @param aClient is the reference to the client's socket.io socket
 * @param rDocs is the array of information retrieved from repository
 * 
 * @emit 'replayInfo' after information retrieval
 * @emit 'gameEnd' when replay is completed
 */
var watchGame = function(aClient, rDocs){
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
  

/**
 * A helper function to query the database and build game information array
 *
 * @param aClient  is the reference to the client's socket.io socket.
 * @param aGameID is a string of numbers unique to a saved game
 * @param callback
 *
 */
//Helper function to query database and build player position arrays
function queryReplay(aClient, aGameID, callback){
  var rDocs = [];
  /* 
    The query into mongo says we are looking for games with the same ID as our argument
    {gameID: Number(aGameID)} This has to be cast as it was pulled from the database and
    only an object
    Then we will iterate over our results to ensure we don't accidentally pull something null   
  */
  db.replays.find({gameID: Number(aGameID)}).forEach(function(err, doc) {
    if(doc != null) { 
      for(var i = 0; i < doc.replayDocs.length; i++){
        rDocs[i] = doc.replayDocs[i];
      }
    }
  });
  callback(aClient, rDocs);
}

/**
 * Helper function to build most current list of repayable games
 * 
 * @param aClient is the reference to the client's socket.io socket.
 *
 * @emit 'games' An array of gameIDs
 */
function buildReplayList (aClient){
  /*
    This query says we want to find anything that has a gameID ({}, {gameID:1})
    Then we iterate over to ensure not null     
  */
  db.replays.find({}, {gameID:1}).forEach(function (err, doc) {
    if(doc != null){
      rGames.push(Number(doc.gameID));
    }
  });
  aClient.volatile.emit('games', {names: rGames});  //emit list of games with replays
}
