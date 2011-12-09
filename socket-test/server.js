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

//Using mongojs to connect to the replays collection in the games database of mongodb
var rDB = require('mongojs').connect('games',['replays']);

var gClients = [];
var gRooms = new Array();
var gNumRooms = 0; //Associative arrays are objects, objects don't have length.
/*
  This gets called when someone connects to the server.
  The argument of the function is essentially a pointer to that particular client's socket.
*/
io.sockets.on('connection', function (aClient) { 

  console.log("Client connecting.");

  var newClient = new Client(aClient, "Bobothy");
  newClient.socket.emit('yeahboi');
  gClients.push(newClient);

  //Server needs to: emit a game list
  aClient.emit('roomList', {rooms: gRooms, numRooms: gNumRooms});
  for(r in gRooms){
    console.log("Room: " + r);
  }


  aClient.on('joinRoom', function(data){
    aClient.join(data.name); //Joining socket.io 'room'
    newClient.currentRoom = gRooms[data.name]; 
    newClient.clientType = data.clientType;
    gRooms[data.name].joinRoom(newClient);
  });

  aClient.on('createRoom', function(data){
    console.log("I want to creat a new room: " + data.name + "!");
    var newRoom = new Room();
    newRoom.setName(data.name);
    newClient.clientType = 'player';
    addRoom(newRoom); 
    aClient.join(data.name);
    console.log("Room length now: " + gNumRooms);
    newRoom.joinRoom(newClient);
    newClient.currentRoom = newRoom;

    console.log("New room: " + gRooms[newRoom.name].getName() + ".");
  });

  //on clientType, just change in client object. 
  aClient.on('clientType', function(data) {
    //Will need to be changed to account for only 2 players at a time.
    newClient.clientType = data.type;
  }); 

  //When a client sends an updatePaddle event, record their new paddle position.
  aClient.on('paddleUpdate', function(aData) {
    //update the value of particular paddle position.
    newClient.setPaddlePos(aData.pos); 
    console.log(newClient.name + " pos:" + newClient.getPaddlePos());
  });

});

function addRoom(newRoom) {
  gRooms[newRoom.getName()] = newRoom;
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

  this.paddlePos;
  this.playerNum;

}

Client.prototype.setPaddlePos = function(newPos) {
  this.paddlePos = newPos;
}

Client.prototype.getPaddlePos = function() {
  return this.paddlePos; 
}

//////////////////////////////////////////////


//Game object!
function Room() {
  this.name;
  /* Variable declarations */
  this.spectators = new Array();
  this.players = new Array();
  this.numPlayers = 0;
  this.gameOn = false;	// Boolean whether or not the game is being played
  this.paddlePos = []; // [player1, player2] height position.
  this.ballPos = [];   // [ballX, ballY] ball positions.
  this.ballV = [];	// [ballVX, ballVY] ball velocities. 
  this.ballR;	// The ball radius (currently not in implementation)
  this.score = [];	// [scorePlayer1, scorePlayer2] player scores.
  this.fieldSize = []; // [fieldX, fieldY] size of the game field.
  this.paddleSize;// [paddleHeight, paddleWidth]
  
  this.rPlayerPos = [[], []]; //[[player1], [player2]] height positions for replays
  this.rBallPos = [[], []]; //[[ballX], [ballY]] ball positions for replays
  this.rGameID; //the gameID that will be queried on replays
  
}

Room.prototype.getName = function(){
  return this.name;
}

Room.prototype.setName = function(name){
  this.name = name; 
}

Room.prototype.joinRoom = function(aClient){
  if(aClient.clientType == 'player'){
    console.log("players length: " + this.players.length);
    //this.paddlePos[this.numPlayers] = client.paddlePos;
    aClient.socket.emit('paddleID', {paddleID: this.players.length});
    console.log("Player " + (this.players.length + 1) + " joined " + "(" + this.name + ")");
    this.players.push(aClient);
  } 
  else if(client.clientType == 'spectator'){
    this.spectators.push(client);
  }
  
  if(this.players.length == 2 && !this.gameOn){
    this.initGame();
    this.startGame();
  }
}

/* This is the main game loop that is set to run every 50 ms. */
Room.prototype.startGame = function(){
    var self = this;
    setInterval(function() {
      self.ballLogic(); //Run ball logic simulation.
      self.sendGameState(); //Send game state to all sockets.
      self.cacheGameState(); //Save game state for database storage
    }, 50);
}
/* 
Initializes the game state.

In future revisions, magic numbers will be replaced with
constants and parameters.
*/
Room.prototype.initGame = function (){
  console.log("Game initializing in " + this.name + "!");
  this.ballPos = [50,50];
  this.score = [0,0];
  this.fieldSize = [100,100];
  this.ballV = [1,2];
  this.ballR = (1/20)*this.fieldSize[1];
  //height, width
  this.paddleSize = [(1/5)*this.fieldSize[0], (1/15)*this.fieldSize[1]];

  this.players[0].setPaddlePos(50);
  this.players[1].setPaddlePos(50);
}

/*
Helper function to send the game state to all connected clients.

This will soon be phased out to support multiple game instances.

Emits updateGame node event with paddle and ball position arrays.
*/
Room.prototype.sendGameState = function(){
  var paddles = [this.players[0].getPaddlePos(), this.players[1].getPaddlePos()];
  io.sockets.in(this.name).volatile.emit('gameState', {paddle: paddles, ball: this.ballPos});
}


/* Sends an scoreUpdate event to all connected clients (will be phased out soon for a more
modular approach */
Room.prototype.sendScore = function(){
 //Still sending to everyone.
 io.sockets.in(this.name).emit('scoreUpdate', { score: this.score });
}

/*
 This ball logic code originated from David Eva, slightly modified for use on the server. Needs tweaking.
*/ 

Room.prototype.ballLogic = function(){

  //Ball bouncing logic
  
  if( this.ballPos[1]<0 || this.ballPos[1]>this.fieldSize[1]){
    this.ballV[1] = -this.ballV[1]; //change gBallPos[1] direction if you go off screen in y direction ....
  }
  
  // Paddle Boundary Logic
  
  // changed all these numbers to more reasonable also, these kinda stuff should also be fields but we can
  // think about that later
  
  if((this.ballPos[0] == 10) && (this.ballPos[1] > this.players[0].getPaddlePos() - 3) && (this.ballPos[1] < (this.players[0].getPaddlePos() + this.paddleSize[0] + 3))){ //if it hits the left paddle
    this.ballV[0] = -this.ballV[0]; //get faster after you hit it
  }
  if((this.ballPos[0] == this.fieldSize[0] - 10) && (this.ballPos[1] > this.players[1].getPaddlePos() - 3) && (this.ballPos[1] < (this.players[1].getPaddlePos() + this.paddleSize[0] + 3))){ //if it hits the right paddle
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
}

/*
Helper functions for the rooms to communicate with the database 
Shelby Lee
*/
Room.prototype.cacheGameState = function(){
  this.rPlayerPos[0].push(this.paddlePos[0]);
  this.rPlayerPos[1].push(this.paddlePos[1]);
  this.rBallPos[0].push(this.ballPos[0]);
  this.rBallPos[1].push(this.ballPos[1]);
}

//Generating unique gameID
Room.prototype.genGameID = function(){
  //Temporarily using unix time for gameID - highly unlikely to have duplicates
  var foo = new Date;
  var unixtime = parseInt(foo.getTime());
  this.rGameID = unixtime;
    
    /*var greatest = 0;
    db.replays.find({},{gameID:1}).forEach(function(err, doc) {
        if(doc != null){
            if(doc.gameID > greatest){
                greatest = doc.gameID;
            }
        }
    });
    this.rGameID = greatest + 1;
    */
}

//Emitting current cached game information to database
Room.prototype.emitReplay = function(){
    db.replays.save({gameID: this.rGameID, playersPos : this.rPlayerPos, ballPos : this.rBallPos});
}