/* Server.js for Vir-Pong, Inc */
/* Daniel Guilak -- daniel.guilak@gmail.com */

var PORT = 3000;
//Require the express framework (which creates a server)
var app = require('express').createServer(),
sys = require(process.binding('natives').util ? 'util' : 'sys')
//and socket.io which provides websocket support.
    sio = require('socket.io');

//set the server to listen on port
app.listen(PORT);

//set the sockets to listen on same port.
var io = sio.listen(app);
io.set('log level', 1); // reduce logging
//SESSIONS
//var sessions = []; // list of all sessions

var clients = [];
var games = [];

function game(gameID){
  this.gameID = gameID;
  this.players = [];
  this.spectators = [];
  this.gameRunning = false;
  this.paddlePos = [50,50];
  this.ballPos = [50,50];

  this.join = function(player){
    this.players.push(player);
  };
  
  this.spectate = function(spectator){
    this.spectators.push(spectator);
  };

  //Temporary function to play game.
  this.startGame = function(){
    setInterval(function() {
      //For every player, send the game state.
      for(p in players){
        sendGameState(p); 
      }
      for(s in spectators){
        sendGameState(s);
      }
    }, 50);
  }; 


  // Helper function to send to a client.
  this.sendGameState = function(socket){
    io.socket.emit('updateGame', {paddle: paddlePos, ball: ballPos});
  };

  this.updatePaddle = function(player, data){
    paddlePos[playerNum] = data.pos; 
    console.log("Player " + (playerNum + 1) + " pos:" + data.pos);
  };
};


//Temporary function to initialize game.
function initGame(){
  console.log("Game initializing!");
  paddlePos = [50,50];
  ballPos = [50,50];
  //Other game initialization stuff that's really important/cool.
}

//when someone connects
io.sockets.on('connection', function (client) {
  console.log("Client connecting.");
  clients.push(client);

  var clientType; 
  var currGame;
  socket.emit('gameList', {list: games});

  client.on('startGame', function(data){
    games.push(new game(client, data.ID));
  });
 
  client.on('joinGame', function(data) {
        
     currGame = games[data.gameIndex];
     clientType = data.type;

     //Determine which list to add the client to.
     if(clientType == 'spectator'){
	currGame.spectate(client);
	console.log('Game ' + currGame.gameID + " spectator!");
     }
     if(clientType == 'player'){
	currGame.join(client);
	console.log('Game ' + currGame.gameID + " spectator!");
     }
  });

  client.on('updatePaddle', function(data) {
    //update the value of particular paddle position.
    currGame.updatePaddle(client, data); 
  });

  client.on('disconnect', function(data) {
    //remove client from any lists?
  });
});


/////////////////////////////
//     HELPER FUNCTIONS
//     From NodePong
/////////////////////////////
// round to nearest hundredth
//function rnd(val) {
//  return Math.round(val*100)/100;
//}
//
//// log shortcut
//function log(x) {
//  console.log(x);
//}
//
//// log a list of variables
//function report(list) {
//  msg = ''
//  for (x in list) {
//    msg += list[x]+': '+eval(list[x])+', ';
//  }
//  log(msg);
//}
//
//// is a member of obj? approximate python's 'is in'
//function contains(a, obj) {
//  var i = a.length;
//  while (i--) { if (a[i] == obj) return true; }
//  return false;
//}
//
//// does obj contain a key with value val? if so return key
//function hasAttr(obj, id, val) {
//  for(x in obj) {
//    for (y in obj[x]) {
//      if (y == id && obj[x][y] == val) {return obj[x];}
//    }
//  }
//  return false;
//}
//
//function eliminateDuplicates(array) {
//  var newArray = new Array();
//
//  label:for(var i=0; i<array.length; i++ ) {
//    for(var j=0; j<newArray.length;j++ ) {
//      if(newArray[j].name==array[i].name) continue label;
//    }
//    newArray[newArray.length] = array[i];
//  }
//  return newArray;
//}
