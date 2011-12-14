/* server.js v.0.3 for vir-pong, inc */ /* daniel guilak -- daniel.guilak@gmail.com */

var PORT = 3000; //Require the express framework (which creates a server) 
var app = require('express').createServer(), sys = require(process.binding('natives').util ? 'util' : 'sys') //and 
//socket.io which provides websocket support.
sio = require('socket.io');

//set the server to listen on port 
app.listen(PORT);

//set the sockets to listen on same port. 
var io = sio.listen(app); 
io.set('log level', 1); // reduce logging

//Using mongojs to connect to the replays collection in the games database of mongodb
var rDB = require('mongojs').connect('games',['replays']);

//For connecting to the user database -- db-mysql
//Remember, mysql_client needs to be installed,
//ubuntu package libmysqlclient16-dev will do it!
var mysql = require('db-mysql');

var gClients = [];
var gRooms = new Array(); 
var gRoomNames = [];
var gNumRooms = 0; //Associative arrays are objects, objects don't have length.

var NOEVENT = 0;
var WALLBOUNCE = 1;
var PADDLEBOUNCE = 2;
var MAXSCORE = 5;
var SCORE = 3;

//  This gets called when someone connects to the server.
//  The argument of the function is essentially a pointer to that particular client's socket. */ 
io.sockets.on('connection', function (aClient) {
  var newClient;
  var isAuthenticated = false;

  console.log("Client connecting.");

  aClient.on('auth', function(data){
    console.log("Authenticating: " + data.username + " " + data.password);
    authenticate(data.username, data.password, function(authenticated){
      if(authenticated == true){
        console.log("Authentication granted for " + data.username);
        aClient.emit('authGranted'); 
        isAuthenticated = true;
        newClient = new Client(aClient, data.username); 
        gClients.push(newClient);
        //Server needs to: emit a game list
        for(r in gRooms){
          console.log("Room: " + r);
        }
        aClient.emit('roomList', {rooms: gRoomNames, numRooms: gNumRooms});

      } else {
        aClient.emit('authFailed');
        console.log("Authentication failed for " + data.username);
      }
    });
  });
  
  aClient.on('joinRoom', function(data){
    if(isAuthenticated){
      aClient.join(data.name); //Joining socket.io 'room'
      newClient.currentRoom = gRooms[data.name];
      newClient.clientType = data.clientType;
      gRooms[data.name].joinRoom(newClient);
    }
  });

  aClient.on('createRoom', function(data){
    if(isAuthenticated){
      var newRoom = new Room();
      newRoom.setName(data.name);
      newClient.clientType = 'player';
      addRoom(newRoom, function(newRoom){
        



      });
      aClient.join(data.name);
      console.log("Room length now: " + gNumRooms);
      newRoom.joinRoom(newClient);
      newClient.currentRoom = newRoom;
      
      gRoomNames.push(newRoom.name);
      console.log("New room: " + gRooms[newRoom.name].getName() + ".");
    }
  });

  //on clientType, just change in client object.
  aClient.on('clientType', function(data) {
    if(isAuthenticated){
      //Will need to be changed to account for only 2 players at a time.
      newClient.clientType = data.type;
    }
  });

  //When a client sends an updatePaddle event, record their new paddle position.
  aClient.on('paddleUpdate', function(aData) {
    if(isAuthenticated){
      //update the value of particular paddle position.
      newClient.setPaddlePos(aData.pos);
      console.log(newClient.name + " pos:" + newClient.getPaddlePos());
    }
  });
  
  aClient.on('disconnect', function(data){
    //Call delete client?
  });

});

function addRoom(newRoom, callback) {
  gRooms[newRoom.getName()] = newRoom;
  gNumRooms = gNumRooms + 1;
  callback();
}

function deleteRoom(r){
  delete gRoomNames[gRoomNames.indexOf(r.name)];
  console.log(gRoomNames);
  console.log("Removing " + r.name);
  delete gRooms[r.name];
  gNumRooms = gNumRooms - 1;
  io.sockets.emit('roomList', {rooms: gRoomNames, numRooms: gNumRooms});
  //delete elements from arrays
}

function authenticate(user, pass, callback){
  var authenticated = false;
  //SQL Database information -- from Web team.
  new mysql.Database({
      hostname: 'localhost',
      user: 'root',
      password: 'sawinrocks',
      database: 'db2'
  }).connect(function(error) {
      console.log("Connecting to database for authentication!");
      if (error) {
        console.log('CONNECTION error: ' + error);
        authenticated = false;
      }
      console.log("Querying");
      console.log('SELECT * FROM Customer WHERE username = \'' + user + '\' AND (password = \'' + pass + '\' OR pin = \'' + pass + '\')');
      this.query('SELECT * FROM Customer WHERE username = \'' + user + '\' AND (password = \'' + pass + '\' OR pin = \'' + pass + '\')').
      execute(function(error, rows, cols) {
        if (error) {
          console.log('ERROR: ' + error);
          authenticated = false;
          callback(false);
        } else {
          if(rows.length != 0){
            console.log("Authenticated or something!");
            callback(true);
          } else {
            callback(false);
          } 
        }
    });
  });
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

Client.prototype.leaveRoom = function() {
  this.currentRoom = null;
}

//////////////////////////////////////////////


//Game object! 
function Room() {
  this.name;
  /* Variable declarations */
  this.pendingEvent = NOEVENT;
  this.spectators = new Array();
  this.players = new Array();
  this.numPlayers = 0;
  this.gameOn = false;	// Boolean whether or not the game is being played
  this.paddlePos = []; // [player1, player2] height position.
  this.ballPos = []; // [ballX, ballY] ball positions.
  this.ballV = []; // [ballVX, ballVY] ball velocities.
  this.ballR;	// The ball radius (currently not in implementation)
  this.score = [];	// [scorePlayer1, scorePlayer2] player scores.
  this.fieldSize = []; // [fieldX, fieldY] size of the game field.
  this.paddleSize;// [paddleHeight, paddleWidth]

  this.rGameID; //the gameID that will be queried on replays
  this.rIndex = 0; //to track replay docs
  this.rDocs = []; //an array of replay docs
}

Room.prototype.prepForDeletion = function(){
  for(p in this.players){
    p.leaveRoom();
    p.socket.leave("/"+this.name);
  }
  deleteRoom(this);
}

Room.prototype.getName = function(){
  return this.name;
}

Room.prototype.setName = function(name){
  this.name = name;
}

Room.prototype.joinRoom = function(aClient){
  var self = this;
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
    this.startGame(this.prepForDeletion);

  } else if (this.players.length == 2 && this.gameOn){
    aClient.emit('gameInfo', {names: [this.players[0].name, this.players[1].name]});
  }
}

/* This is the main game loop that is set to run every 50 ms. */ 
Room.prototype.startGame = function(cb){
    var self = this;
    var callback = cb;
    self.gameOn = true;
    self.genGameID();  //generating gameID
    var gameInterval = setInterval(function() {
      self.ballLogic(); //Run ball logic simulation.
      self.sendGameState(); //Send game state to all sockets.
      //self.cacheGameState(); //caches game state to store into database.
      if(self.gameOn == false){
        clearInterval(gameInterval);
        callback();
      }
    }, 50);
}
/* Initializes the game state.

In future revisions, magic numbers will be replaced with constants and parameters. */
Room.prototype.initGame = function (){
  io.sockets.in(this.name).emit('gameInfo', {names: [this.players[0].name, this.players[1].name]});
  
  console.log("Game initializing in " + this.name + "!");
  this.ballPos = [50,50];
  this.score = [0,0];
  this.fieldSize = [100,100];
  this.ballV = [1,2];
  this.ballR = (1/20)*this.fieldSize[1];
  //width, height

  this.paddleSize = [3,(1/5)*this.fieldSize[1]]; 

  this.players[0].setPaddlePos(50);
  this.players[1].setPaddlePos(50);
}

/* Helper function to send the game state to all connected clients.

This will soon be phased out to support multiple game instances.

Emits updateGame node event with paddle and ball position arrays. */
Room.prototype.sendGameState = function(){
  var paddles = [this.players[0].getPaddlePos(), this.players[1].getPaddlePos()];
  io.sockets.in(this.name).volatile.emit('gameState', {paddle: paddles, ball: this.ballPos, gameEvent: this.pendingEvent});
  this.rDocs.push({index: this.rIndex, paddle: paddles,
		   ball: [this.ballPos[0], this.ballPos[1]], scores: [this.score[0], this.score[1]]});
  this.rIndex = this.rIndex + 1; //increment the index
this.pendingEvent = NOEVENT;
}


/* Sends an scoreUpdate event to all connected clients (will be phased out soon for a more modular approach */ 
Room.prototype.sendScore = function(){
 //Still sending to everyone.
 var self = this;

 console.log("(" + this.name + "): " + this.score[0] + " to " + this.score[1]);
 io.sockets.in(this.name).emit('scoreUpdate', { score: this.score });
 if(this.score[0] == MAXSCORE || this.score[1] == MAXSCORE){
   var winner;
   if(this.score[0] == MAXSCORE){
     winner = this.players[0].name;
   }
   else if(this.score[1] == MAXSCORE){
     winner = this.players[1].name;
   }

   console.log("Game " + this.name + " has ended.");
   io.sockets.in(this.name).emit('gameEnd');
   
   ///////////////////////////////////////////////////////////////////
   new mysql.Database({
      hostname: 'localhost',
      user: 'root',
      password: 'sawinrocks',
      database: 'db2'
   }).connect(function(error){
    if (error) {
        return console.log('CONNECTION error: ' + error);
    }
    this.query().
        insert('GamesPlayed', 
            ['username1', 'username2', 'score1', 'score2', 'win'], 
            [self.players[0].name, self.players[1].name, self.score[0], self.score[1], winner]
        ).
        execute(function(error, result) {
                if (error) {
                        console.log('ERROR: ' + error);
                        return;
                }
                console.log('GENERATED id: ' + result.id);
        });
    });
   this.gameOn = false;

   this.emitReplay(); //emit cached information to database
 }
}

/*
 This ball logic code originated from David Eva, slightly modified for use on the server. Needs tweaking. */

Room.prototype.ballLogic = function(){

    //Ball bouncing logic
    
    if( this.ballPos[1] - this.ballR < 0 || this.ballPos[1] + this.ballR >this.fieldSize[1]){
      this.ballV[1] = -this.ballV[1]; //change gBallPos[1] direction if you go off screen in y direction ....
      this.pendingEvent = WALLBOUNCE;
     }
    
    // Paddle Boundary Logic
    // Left paddle
    if(this.ballPos[0] == this.paddleSize[0] &&  //Left paddle's x
       this.ballPos[1] >= this.players[0].getPaddlePos() && 
       this.ballPos[1] <= (this.players[0].getPaddlePos() + this.paddleSize[1])) //Left paddle's y range
      { 
         console.log((this.fieldSize[0] - this.paddleSize[0]) + " paddlex: " + this.paddleSize[0]);
         this.ballV[0] = -this.ballV[0]; //changes x direction
         this.pendingEvent = PADDLEBOUNCE;
      }
  
    else if(this.ballPos[0] < this.paddleSize[0] &&
            this.ballPos[0] > 0 &&           //X boundary of the edges
           (this.ballPos[1] == this.players[0].getPaddlePos() || 
            this.ballPos[1] == (this.players[0].getPaddlePos() + this.paddleSize[1])) //Y boundary of the edges
           ){ //top and bottom of left paddle
  	    this.ballV[1] = -this.ballV[1]; //changes y direction
  	    this.pendingEvent = PADDLEBOUNCE;
  	  }
    
  
    // Right paddle
  
    if(this.ballPos[0] == this.fieldSize[0] - this.paddleSize[0] && //Right paddle's x
       this.ballPos[1] >= this.players[1].getPaddlePos() &&
       this.ballPos[1] <= (this.players[1].getPaddlePos() + this.paddleSize[1])) //Right paddle's y range
      { 
         this.ballV[0] = -this.ballV[0]; // changes x direction
         this.pendingEvent = PADDLEBOUNCE;
      }
  
    else if(this.ballPos[0] > this.fieldSize[0] - this.paddleSize[0] &&
            this.ballPos[0] < this.fieldSize[0] &&               //X boundary of the edges
           (this.ballPos[1] == this.players[1].getPaddlePos() || 
            this.ballPos[1] == (this.players[1].getPaddlePos() + this.paddleSize[1])) //Y boundary of the edges
           ){ //top and bottom of right paddle
  	    this.ballV[1] = -this.ballV[1]; // changes y direction
  	    this.pendingEvent = PADDLEBOUNCE;
  	  }
    
    
    // if ball goes out of frame reset in the middle and put to default speed and increment gScore...
    
    if(this.ballPos[0] + this.ballR < 0){ //changed these numbers you had old ones so ball was going super far out of frame
      this.ballPos[0] = this.fieldSize[0]/2;
      this.ballPos[1] = Math.floor(Math.random()*(this.fieldSize[1]-2))+1; //Randomize starting y pos(1 to fieldsize -1 to account for boundry issues)
      this.ballV[0] = -1;  // Changes the direction of the ball if Player 2 scored
      var dir = Math.floor(Math.random()*2);// random direction variable(1 or 0)  
      if(dir == 0){
      	dir = -2;//ball direction is up
      }else{
	dir = 2;//ball direction is down
      }
      this.ballV[1] = dir;
      this.score[1] = this.score[1] + 1;
      this.sendScore();
    }
    if(this.ballPos[0] + this.ballR > this.fieldSize[0] + 10){ //changed these numbers you had old ones so ball was going super far out of frame
      this.ballPos[0] = this.fieldSize[0]/2;
      this.ballPos[1] = Math.floor(Math.random()*(this.fieldSize[1]-2))+1; //Randomize starting y pos(1 to fieldsize -1 to account for boundry issues)
      this.ballV[0] = 1;
      var dir = Math.floor(Math.random()*2);// random direction variable(1 or 0)       
      if(dir == 0){
      	dir = -2;//ball direction is up
      }else{
	dir = 2;//ball direction is down
      }
      this.ballV[1] = dir;
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
//Caches game state into array on every emit to client
Room.prototype.cacheGameState = function(){
  var paddles = [this.players[0].getPaddlePos(), this.players[1].getPaddlePos()];
  this.rDocs.push({index: this.rIndex, paddle: paddles,
		   ball: this.ballPos, scores: this.score});
  this.rIndex = this.rIndex + 1; //increment the index
}

//Generating unique gameID
Room.prototype.genGameID = function(){
  //Temporarily using unix time for gameID - highly unlikely to have duplicates
  var foo = new Date;
  var unixtime = parseInt(foo.getTime());
  this.rGameID = unixtime;
}

//Emitting current cached game information to database
Room.prototype.emitReplay = function(){
  //Simply putting the array into the database
  rDB.replays.save({gameID: this.rGameID, replayDocs: this.rDocs});
}
