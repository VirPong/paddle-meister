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
var gNumRooms = 0; //Associative arrays are objects, objects don't have length.
/*
  This gets called when someone connects to the server.
  The argument of the function is essentially a pointer to that particular client's socket.
*/
io.sockets.on('connection', function (aClient) { 

  console.log("Client connecting.");

  newClient = new Client(aClient, "Bobothy");
  newClient.socket.emit('yeahboi');
  console.log("Created new client: " + newClient.name);
  gClients.push(newClient);

  //Server needs to: emit a game list
  aClient.emit('roomList', {rooms: gRooms, numRooms: gNumRooms});

  aClient.on('joinRoom', function(data){
    aClient.join(data.name);
    newClient.currentRoom = gRooms[data.name]; 
    newClient.clientType = data.clientType;
    gRooms[data.name].joinRoom(newClient);
  });

  aClient.on('createRoom', function(data){
    console.log("I want to creat a new room: " + data.name + "!");
    var newRoom = new Room(data.name);
    newClient.clientType = 'player';
    console.log("Adding new room.");
    addRoom(newRoom); 
    aClient.join(data.name);
    console.log("Room length now: " + gNumRooms);
    newRoom.joinRoom(newClient);
    newClient.currentRoom = newRoom;

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

function addRoom(newRoom) {
  gRooms[newRoom.name] = newRoom;
  gNumRooms = gNumRooms + 1; 
}

//TODO: This guy.
function removeRoom(){
}

//Client object -- would make sense to have player and spectator inheirit at some point.
function Client (socket, name) {
  this.socket = socket;
  this.name = name;
  this.clientType;
  this.currentRoom;

  this.paddlePos = 50;
  this.playerNum;
}


//Game object!
function Room (name) {
  this.name = name;
  var self = this;
  /* Variable declarations */
  this.spectators = new Array();
  this.players = new Array();
  this.numPlayers = 0;
  this.gameOn = false;	// Boolean whether or not the game is being played
  this.paddlePos = []; // [player1, player2] height position.
  this.ballPos = [];   // [ballX, ballY] ball positions.
  this.ballVi = [];	// [ballVX, ballVY] ball velocities. 
  this.ballR;	// The ball radius (currently not in implementation)
  this.score = [];	// [scorePlayer1, scorePlayer2] player scores.
  this.fieldSize = []; // [fieldX, fieldY] size of the game field.
  this.paddleSize;// [paddleHeight, paddleWidth]
  
  this.joinRoom = function(client){
    if(client.clientType == 'player'){
      this.players.push(client);
      this.paddlePos[this.numPlayers] = client.paddlePos;
      client.socket.emit('paddleID', {paddleID: this.numPlayers});
      this.numPlayers = this.numPlayers + 1;
      console.log("Number of players in " + this.name + ": " + this.numPlayers);
    } 
    else if(client.clientType == 'spectator'){
      this.spectators.push(client);
    }
    
    if(this.numPlayers == 2 && !this.gameOn){
      this.initGame();
      this.startGame();
    }
  };

  /* This is the main game loop that is set to run every 50 ms. */
  this.startGame = function(){
      setInterval(function() {
        self.ballLogic(); //Run ball logic simulation.
        self.sendGameState(); //Send game state to all sockets.
      }, 50);
  }
  /* 
  Initializes the game state.
  
  In future revisions, magic numbers will be replaced with
  constants and parameters.
  */
  this.initGame = function (){
    console.log("Game initializing in " + this.name + "!");
    this.ballPos = [50,50];
    this.score = [0,0];
    this.fieldSize = [100,100];
    this.ballV = [1,2];
    this.ballR = (1/20)*this.fieldSize[1];
    //height, width
    this.paddleSize = [(1/5)*this.fieldSize[0], (1/15)*this.fieldSize[1]];
  };

  /*
  Helper function to send the game state to all connected clients.
  
  This will soon be phased out to support multiple game instances.
  
  Emits updateGame node event with paddle and ball position arrays.
  */
  this.sendGameState = function(){
    io.sockets.in(this.name).volatile.emit('gameState', {paddle: this.paddlePos, ball: this.ballPos});
  };
  
  
  /* Sends an scoreUpdate event to all connected clients (will be phased out soon for a more
  modular approach */
  this.sendScore = function(){
   //Still sending to everyone.
   io.sockets.in(this.name).emit('scoreUpdate', { score: this.score });
  };
  
  /*
   This ball logic code originated from David Eva, slightly modified for use on the server. Needs tweaking.
  */ 
  
  this.ballLogic = function(){
  
    //Ball bouncing logic
    
    if( this.ballPos[1]<0 || this.ballPos[1]>this.fieldSize[1]){
      this.ballV[1] = -this.ballV[1]; //change gBallPos[1] direction if you go off screen in y direction ....
    }
    
    // Paddle Boundary Logic
    
    // changed all these numbers to more reasonable also, these kinda stuff should also be fields but we can
    // think about that later
    
    if((this.ballPos[0] == 10) && (this.ballPos[1] > this.paddlePos[0] - 3) && (this.ballPos[1] < (this.paddlePos[0] + this.paddleSize[0] + 3))){ //if it hits the left paddle
      this.ballV[0] = -this.ballV[0]; //get faster after you hit it
    }
    if((this.ballPos[0] == this.fieldSize[0] - 10) && (this.ballPos[1] > this.paddlePos[1] - 3) && (this.ballPos[1] < (this.paddlePos[1] + this.paddleSize[0] + 3))){ //if it hits the right paddle
      this.ballV[0] = -this.ballV[0];
    }
    
    // if ball goes out of frame reset in the middle and put to default speed and increment gScore...
    
    if(this.ballPos[0] < -10){ //changed these numbers you had old ones so ball was going super far out of frame
      this.ballPos[0] = this.fieldSize[0]/2;
      this.ballPos[1] = this.fieldSize[1]/2;
      this.ballV[0] = 1;
      this.ballV[1] = 2;
      this.score[1] = this.score[1] + 1;
      this.sendScore();
    }
    if(this.ballPos[0] >this.fieldSize[0] +10 ){ //changed these numbers you had old ones so ball was going super far out of frame
      this.ballPos[0] = this.fieldSize[0]/2;
      this.ballPos[1] = this.fieldSize[1]/2;
      this.ballV[0] = 1;
      this.ballV[1] = 2;
      this.score[0] = this.score[0] + 1; 
      this.sendScore();
    }
    
    this.ballPos[0]+=this.ballV[0];
    this.ballPos[1]+=this.ballV[1];
  };

}

