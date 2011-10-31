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

//Arrays for spectators and players.
var spectators = [];
var players = [];

var paddlePos;
var ballPos;
var ballV;
var score;
var fieldSize;
var paddleSize;

console.log("
 _______  _______  _        _______ 
(  ____ )(  ___  )( (    /|(  ____ \
| (    )|| (   ) ||  \  ( || (    \/
| (____)|| |   | ||   \ | || |      
|  _____)| |   | || (\ \) || | ____ 
| (      | |   | || | \   || | \_  )
| )      | (___) || )  \  || (___) |
|/       (_______)|/    )_)(_______)
");

// Helper function to send to a client.
function sendGameState(){
  io.sockets.emit('updateGame', {paddle: paddlePos, ball: ballPos});
}

//Temporary function to play game.
function startGame(){
setInterval(function() {
    ballLogic();
    //For every player, send the game state.
    for(p in players){
      sendGameState(p); 
    }
    for(s in spectators){
      sendGameState(s);
    }
  }, 50);
}


//BALL LOGIC FROM WWW

function ballLogic(){

  //Ball bouncing logic
  
  if( ballPos[1]<0 || ballPos[1]>fieldSize[1]){
    ballV[1] = -ballV[1]; //change ballPos[1] direction if you go off screen....
  }
  
  // Paddle Boundary Logic
  
  // changed all these numbers to more reasonable also, these kinda stuff should also be fields but we can
  // think about that later
  
  if((ballPos[0] <= 10) && (ballPos[0] > 5) && (ballPos[1] > paddlePos[0]) && (ballPos[1] < (paddlePos[0] + paddleSize[0]))){ //if it hits the left paddle
    ballV[0] = -1.1*ballV[0]; //get faster after you hit it
  }
  if((ballPos[0] >= fieldSize[0] - 10) && (ballPos[0] <= fieldSize[0] - 5) && (ballPos[1] >= paddlePos[1]) && (ballPos[1] <= (paddlePos[1] + paddleSize[0]))){ //if it hits the right paddle
    ballV[0] = -1.1*ballV[0];
  }
  
  // if ball goes out of frame reset in the middle and put to default speed and increment score...
  
  if(ballPos[0] < -40){ //changed these numbers you had old ones so ball was going super far out of frame
    ballPos[0] = fieldSize[0]/2;
    ballPos[1] = fieldSize[1]/2;
    ballV[0] = 1;
    ballV[1] = 2;
    score[1]++;
    //sendScore();
  }
  if(ballPos[0] > 250){ //changed these numbers you had old ones so ball was going super far out of frame
    ballPos[0] = fieldSize[0]/2;
    ballPos[1] = fieldSize[1]/2;
    ballV[0] = 1;
    ballV[1] = 2;
    score[0]++;
    //sendScore();
  }
  
  ballPos[0]+=ballV[0];
  ballPos[1]+=ballV[1];
}

//Temporary function to initialize game.
function initGame(){
  console.log("Game initializing!");
  paddlePos = [50,50];
  ballPos = [50,50];
  score = [0,0];
  fieldSize = [137,76];
  ballV = [1,2];
  ballR = (1/20)*fieldSize[1];
  //height, width
  paddleSize = [(1/10)*fieldSize[0], (1/20)*fieldSize[1]];
  //Other game initialization stuff that's really important/cool.
}

//when someone connects
io.sockets.on('connection', function (client) {
  console.log("Client connecting.");
  var clientType; 
  var playerNum;

  //socket.emit('news', { hello: 'world', foo:'bar' });
  client.on('clientType', function(data) {
     clientType = data.type;

     //Determine which list to add the client to.
     if(clientType == 'spectator'){
	spectators.push(client);
	console.log('Spectator!');
     }
     if(clientType == 'player'){
	if(players.length == 0){
	  playerNum = 0;
	} else {
	  playerNum = 1;
	}
	players.push(client);
	client.emit('paddleNum', {paddleNum: playerNum});
	console.log('Player!');
     }
     	
     
     //Temporary for TESTING
     initGame();
     startGame();

     if(players.length == 2){
//	initGame();
     }	
  });

  client.on('updatePaddle', function(data) {
    //update the value of particular paddle position.
    paddlePos[playerNum] = data.pos; 
    console.log("Player " + (playerNum + 1) + " pos:" + data.pos);
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
