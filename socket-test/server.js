/* Server.js v.0.2 for Vir-Pong, Inc */
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

var gClients = [];
var gRooms = [];
/*
  This gets called when someone connects to the server.
  The argument of the function is essentially a pointer to that particular client's socket.
*/
io.sockets.on('connection', function (aClient) { //Note: connection is a library-specific event and its name cannot be easily changed.
  console.log("Client connecting.");
  newClient = new Client(aClient, "Bobothy");
  gClients.push(newClient);
  //Server needs to: emit a game list
  aClient.emit('roomList', {});
  aClient.on('joinRoom', function(){});
  //on clientType, just change in client object. 
  aClient.on('clientType', function(data) {
    //Will need to be changed to account for only 2 players at a time.
    newClient.clientType = data.type;
  }); 

  //When a client sends an updatePaddle event, record their new paddle position.
  aClient.on('paddleUpdate', function(aData) {
    //update the value of particular paddle position.
    newClient.paddlePos = aData.pos; 
    console.log(newClient.name + " pos:" + newClient.paddlePos);
  });

});

//Client object -- would make sense to have player and spectator inheirit at some point.
function Client (socket, name) {
  this.socket = socket;
  this.name = name;
  this.clientType;

  this.paddlePos;
  this.playerNum;
}

//Game object!
function Room (name, owner) {
  this.name;
  this.owner;

  /* Variable declarations */
  this.spectators = [];
  this.players = [];
  this.gameOn; 	// Boolean whether or not the game is being played
  this.paddlePos; // [player1, player2] height position.
  this.ballPos;   // [ballX, ballY] ball positions.
  this.ballV;	// [ballVX, ballVY] ball velocities. 
  this.ballR;	// The ball radius (currently not in implementation)
  this.score;	// [scorePlayer1, scorePlayer2] player scores.
  this.fieldSize; // [fieldX, fieldY] size of the game field.
  this.paddleSize;// [paddleHeight, paddleWidth]
  
  /* 
  Initializes the game state.
  
  In future revisions, magic numbers will be replaced with
  constants and parameters.
  */
  function initGame(){
    console.log("Game initializing!");
    paddlePos = [50,50];
    ballPos = [50,50];
    score = [0,0];
    fieldSize = [100,100];
    ballV = [1,2];
    ballR = (1/20)*fieldSize[1];
    //height, width
    paddleSize = [(1/5)*fieldSize[0], (1/15)*fieldSize[1]];
  }

  /*
  Helper function to send the game state to all connected clients.
  
  This will soon be phased out to support multiple game instances.
  
  Emits updateGame node event with paddle and ball position arrays.
  */
  function sendGameState(){
    io.sockets.in(name).volatile.emit('gameState', {paddle: paddlePos, ball: ballPos});
  }
  
  /* This is the main game loop that is set to run every 50 ms. */
  function startGame(){
  setInterval(function() {
      ballLogic(); //Run ball logic simulation.
      sendGameState(); //Send game state to all sockets.
    }, 50);
  }
  
  /* Sends an scoreUpdate event to all connected clients (will be phased out soon for a more
  modular approach */
  function sendScore(){
   //Still sending to everyone.
   io.sockets.in(name).emit('scoreUpdate', { score: score });
  }
  
  /*
   This ball logic code originated from David Eva, slightly modified for use on the server. Needs tweaking.
  */ 
  
  function ballLogic(){
  
    //Ball bouncing logic
    
    if( gBallPos[1]<0 || gBallPos[1]>gFieldSize[1]){
      gBallV[1] = -gBallV[1]; //change gBallPos[1] direction if you go off screen in y direction ....
    }
    
    // Paddle Boundary Logic
    
    // changed all these numbers to more reasonable also, these kinda stuff should also be fields but we can
    // think about that later
    
    if((gBallPos[0] == 10) && (gBallPos[1] > gPaddlePos[0] - 3) && (gBallPos[1] < (gPaddlePos[0] + gPaddleSize[0] + 3))){ //if it hits the left paddle
      gBallV[0] = -gBallV[0]; //get faster after you hit it
    }
    if((gBallPos[0] == gFieldSize[0] - 10) && (gBallPos[1] > gPaddlePos[1] - 3) && (gBallPos[1] < (gPaddlePos[1] + gPaddleSize[0] + 3))){ //if it hits the right paddle
      gBallV[0] = -gBallV[0];
    }
    
    // if ball goes out of frame reset in the middle and put to default speed and increment gScore...
    
    if(gBallPos[0] < -10){ //changed these numbers you had old ones so ball was going super far out of frame
      gBallPos[0] = gFieldSize[0]/2;
      gBallPos[1] = gFieldSize[1]/2;
      gBallV[0] = 1;
      gBallV[1] = 2;
      gScore[1] = gScore[1] + 1;
      sendScore();
    }
    if(gBallPos[0] >gFieldSize[0] +10 ){ //changed these numbers you had old ones so ball was going super far out of frame
      gBallPos[0] = gFieldSize[0]/2;
      gBallPos[1] = gFieldSize[1]/2;
      gBallV[0] = 1;
      gBallV[1] = 2;
      gScore[0] = gScore[0] + 1; 
      sendScore();
    }
    
    gBallPos[0]+=gBallV[0];
    gBallPos[1]+=gBallV[1];
  }

}

