/* Server.js v.0.3 for Vir-Pong, Inc */
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
var gRooms = new Array();
/*
  This gets called when someone connects to the server.
  The argument of the function is essentially a pointer to that particular client's socket.
*/
io.sockets.on('connection', function (aClient) { 
  console.log("Client connecting.");

  newClient = new Client(aClient, "Bobothy");
  gClients.push(newClient);

  //Server needs to: emit a game list
  aClient.emit('roomList', {rooms: gRooms});

  aClient.on('joinRoom', function(data){
    aClient.join(data.name);
    newClient.currentRoom = gRooms[data.name]; 
    newClient.clientType = data.clientType;
    gRooms[data.name].join(newClient);
  });

  aClient.on('createRoom', function(data){
    aClient.join(data.name);
    newRoom = new Room(data.name);
    newClient.clientType = 'player';
    gRooms[newRoom.name] = newRoom;
    newClient.currentRoom = newRoom;
    gRooms[newRoom.name].join(newClient);

    console.log("New room: " + newRoom.name + ".");
  });

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
  this.currentRoom;

  this.paddlePos;
  this.playerNum;
}

//Game object!
function Room (name) {
  this.name = name;

  /* Variable declarations */
  this.spectators = [];
  this.players = [];
  this.numPlayers = 0;
  this.gameOn = false;	// Boolean whether or not the game is being played
  this.paddlePos; // [player1, player2] height position.
  this.ballPos;   // [ballX, ballY] ball positions.
  this.ballV;	// [ballVX, ballVY] ball velocities. 
  this.ballR;	// The ball radius (currently not in implementation)
  this.score;	// [scorePlayer1, scorePlayer2] player scores.
  this.fieldSize; // [fieldX, fieldY] size of the game field.
  this.paddleSize;// [paddleHeight, paddleWidth]
  
  this.join = function(client){
    if(client.clientType == 'player'){
      players.push(client);
      client.socket.emit('paddleID', {paddleID: numPlayers});
      numPlayers = numPlayers + 1;
    } 
    else if(client.clientType == 'spectator'){
      spectators.push(client);
    }
    
    if(numPlayers == 2 && !gameOn){
      this.initGame();
      this.startGame();
    }
  };

  /* 
  Initializes the game state.
  
  In future revisions, magic numbers will be replaced with
  constants and parameters.
  */
  this.initGame = function (){
    console.log("Game initializing in " + this.name + "!");
    paddlePos = [50,50];
    ballPos = [50,50];
    score = [0,0];
    fieldSize = [100,100];
    ballV = [1,2];
    ballR = (1/20)*fieldSize[1];
    //height, width
    paddleSize = [(1/5)*fieldSize[0], (1/15)*fieldSize[1]];
  };

  /*
  Helper function to send the game state to all connected clients.
  
  This will soon be phased out to support multiple game instances.
  
  Emits updateGame node event with paddle and ball position arrays.
  */
  this.sendGameState = function(){
    io.sockets.in(this.name).volatile.emit('gameState', {paddle: paddlePos, ball: ballPos});
  };
  
  /* This is the main game loop that is set to run every 50 ms. */
  this.startGame = function(){
      this.setInterval(function() {
      this.ballLogic(); //Run ball logic simulation.
      this.sendGameState(); //Send game state to all sockets.
    }, 50);
  };
  
  /* Sends an scoreUpdate event to all connected clients (will be phased out soon for a more
  modular approach */
  this.sendScore = function(){
   //Still sending to everyone.
   io.sockets.in(this.name).emit('scoreUpdate', { score: score });
  };
  
  /*
   This ball logic code originated from David Eva, slightly modified for use on the server. Needs tweaking.
  */ 
  
  this.ballLogic = function(){
  
    //Ball bouncing logic
    
    if( ballPos[1]<0 || ballPos[1]>fieldSize[1]){
      ballV[1] = -ballV[1]; //change gBallPos[1] direction if you go off screen in y direction ....
    }
    
    // Paddle Boundary Logic
    
    // changed all these numbers to more reasonable also, these kinda stuff should also be fields but we can
    // think about that later
    
    if((ballPos[0] == 10) && (ballPos[1] > paddlePos[0] - 3) && (ballPos[1] < (paddlePos[0] + paddleSize[0] + 3))){ //if it hits the left paddle
      ballV[0] = -ballV[0]; //get faster after you hit it
    }
    if((ballPos[0] == fieldSize[0] - 10) && (ballPos[1] > paddlePos[1] - 3) && (ballPos[1] < (paddlePos[1] + paddleSize[0] + 3))){ //if it hits the right paddle
      ballV[0] = -ballV[0];
    }
    
    // if ball goes out of frame reset in the middle and put to default speed and increment gScore...
    
    if(ballPos[0] < -10){ //changed these numbers you had old ones so ball was going super far out of frame
      ballPos[0] = fieldSize[0]/2;
      ballPos[1] = fieldSize[1]/2;
      ballV[0] = 1;
      ballV[1] = 2;
      score[1] = score[1] + 1;
      this.sendScore();
    }
    if(ballPos[0] >fieldSize[0] +10 ){ //changed these numbers you had old ones so ball was going super far out of frame
      ballPos[0] = fieldSize[0]/2;
      ballPos[1] = fieldSize[1]/2;
      ballV[0] = 1;
      ballV[1] = 2;
      score[0] = score[0] + 1; 
      this.sendScore();
    }
    
    ballPos[0]+=ballV[0];
    ballPos[1]+=ballV[1];
  };

}

