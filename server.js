/* server.js v.0.4 for vir-pong, inc */
/* daniel guilak -- daniel.guilak@gmail.com */

//Change me to any port you want me to listen on!
//Remember, you won't be able to go under 1024
//without running as root.
var PORT = 3000; 

//Require the express framework (which creates a server) 
var app = require('express').createServer(), 
          sys = require(process.binding('natives').util ? 'util' : 'sys') 

//socket.io provides websocket support.
sio = require('socket.io');

//set the server to listen on port 
app.listen(PORT);

//set the sockets to listen on same port. 
var io = sio.listen(app); 
io.set('log level', 1); // reduce logging


//For connecting to the user database -- db-mysql
//Remember, mysql_client needs to be installed,
//ubuntu package libmysqlclient16-dev will do it!
var mysql = require('db-mysql');

//Using mongojs to connect to the replays collection database 
var rDB = require('mongojs').connect('games',['replays']);

/* Server instances */
var gClients = [];	//The socket.io clients that are connected.
var gRooms = []; 	//Array of global Room objects.
var gRoomNames = [];	//Array of global Room names.
var gNumRooms = 0; //Keeps track of number of rooms (AArrays don't have length).

var MAXSCORE = 6;	//Play to this many points.
var UPDATE_INTERVAL = 50; //Number of milliseconds to send updates.

/*
*
* Gets called whenever someone connects to the server.
* 
* @param eventName='connection', function(aClient)
* aClient is the reference to the client's socket.io socket.
*
*/
io.sockets.on('connection', function (aClient) {
  //This will be the new instance of Client.
  var newClient;
  //This will determine if the client is authenticated or not.
  var isAuthenticated = false;

  console.log("Client connecting.");
  
  /*
  *
  * On authentication request from client.
  * 
  * Authenticates using mySQL database and notifies client of access
  * granted or denied.
  * 
  * @param eventName='auth', function(data)
  * data.username should have username
  * data.password should have password information. 
  * 
  * @emits 'authGranted' on successful authentication
  * @emits 'authFailed' on unsucessful authentication.
  *
  */
  aClient.on('auth', function(data){
    console.log("Authenticating: " + data.username + " " + data.password);
    authenticate(data.username, data.password, function(authenticated){
      if(authenticated == true){
        aClient.emit('authGranted');
        isAuthenticated = true;
        newClient = new Client(aClient, data.username); //Creates a new Client.
        gClients.push(newClient);

	//Sends out an updated room list to the client.
        aClient.emit('roomList', {rooms: gRoomNames, numRooms: gNumRooms});

      } else {
	//if authentication fails:
        aClient.emit('authFailed');
        console.log("Authentication failed for " + data.username);
      }
    });
  });

  /*
  *
  * On joinRoom from client
  * Adds client to a certain Room object, as well as connects them to
  * their respective socket.io room for communication purposes.
  * 
  * @param eventName='joinRoom', function(aClient)
  * @param aClient is the reference to the client's socket.io socket.
  * data.name is the name of the room client wishes to join.
  *
  */
  aClient.on('joinRoom', function(data){
    if(isAuthenticated || data.name == null){  //As long as the client has logged in.
      aClient.join(data.name); //Joining socket.io 'room'
      newClient.currentRoom = gRooms[data.name]; //Changing current room
      newClient.clientType = data.clientType; //Changing type
      gRooms[data.name].joinRoom(newClient); //Joining room.
    }
  });

  /*
  *
  * On createRoom from client
  * Creates a new room with specified name, adds client to that Room.
  * Also adds client to socket.io group.
  * 
  * @param eventName='createRoom', function(aClient)
  * @param aClient is the reference to the client's socket.io socket.
  * data.name is the requested name for the room.
  * 
  */
  aClient.on('createRoom', function(data){
    if(isAuthenticated){
      //Creates the new room and sets its name
      var newRoom = new Room(data.name);

      //Automatically makes the client a player.
      newClient.clientType = 'player';
      
      //Adds the client to the room
      addRoom(newRoom);
      aClient.join(data.name);
      console.log("Room length now: " + gNumRooms);
      newRoom.joinRoom(newClient);
      newClient.currentRoom = newRoom;
      
      gRoomNames.push(newRoom.name);
    }
  });

  /*
  *
  * On clientType from client.
  * This is how the client specifies if they are spectating or playing.
  * 
  * @param eventName='clientType', function(aClient)
  * @param aClient is the reference to the client's socket.io socket.
  * aData.type the type of client requested ('player', 'spectator')
  * 
  */
  aClient.on('clientType', function(aData) {
    if(isAuthenticated){
      newClient.clientType = aData.type;
    }
  });

  /*
  *
  * On paddleUpdate from client
  * As the paddle information for each client is stored within their instance
  * of Client, this function catches any paddle update information from a
  * particular client and updates their position.
  * 
  * @param eventName='paddleUpdate', function(aClient)
  * @param aClient is the reference to the client's socket.io socket.
  * aData.pos is a number between 0 and 100 corresponding to what the vertical
  * position of a certain paddle is.
  */
  aClient.on('paddleUpdate', function(aData) {
    if(isAuthenticated){
      //update the value of particular paddle position.
      newClient.paddlePos = aData.pos;
    }
  });

  /*
  *
  * On disconnect from client -- gets called when a client 
  * disconnects.
  * 
  * @param eventName='disconnect', function(aClient)
  * @param aClient is the reference to the client's socket.io socket.
  * 
  */
  aClient.on('disconnect', function(data){
    //Deletes Client instance from client array
    delete gClients[gClients.indexOf(newClient)];
    delete newClient;
  });

});

/*
*
* Helper function for adding a room to the global room
* lists.
* 
* @param newRoom the room to add to the lists.
*/
function addRoom(newRoom) {
  gRooms[newRoom.name] = newRoom;
  gNumRooms = gNumRooms + 1;
}

/*
*
* Provides functionality for deleting a room after a game ends.
* 
* @param r the room instance's name to remove from the server 
*
*/
function deleteRoom(room){

  //Removes players from rooms and socket.io rooms.
  for(p in room.players){
    room.players[p].leaveRoom();

    //leave from socket.io room.
    room.players[p].socket.leave("/"+room.name);
  }

  var toBeDeleted = gRoomNames.indexOf(room.name);

  delete gRoomNames[toBeDeleted];

  console.log("Removing " + room.name);
  delete gRooms[room.name];
  gNumRooms = gNumRooms - 1;

  //Emit an updated room list to everyone.
  io.sockets.emit('roomList', {rooms: gRoomNames, numRooms: gNumRooms});
}

/*
*
* Provides functionality for connecting to the WebUI team's
* mySQL database for authenticating users.
* 
* This code was developed in joint with the WebUI team.
* There is some duplicate code here, but it is minimal and it works.
*
* @param user username
* @param pass password
* @param callback(true) if authenticated, callback(false) if not.
*
*/

function authenticate(user, pass, callback){
  //SQL Database information -- from Web team.
  new mysql.Database({
      hostname: 'localhost',
      user: 'root',
      password: 'sawinrocks',
      database: 'db2'
  }).connect(function(error) {
      if (error) {
        console.log('CONNECTION error: ' + error);
      }

      //Query provided by WebUI team.
      this.query('SELECT * FROM Customer WHERE username = \'' + user + '\' AND (password = \'' + pass + '\' OR pin = \'' + pass + '\')').
      /*
       * Internal method from db library.
       */
      execute(function(error, rows, cols) {
        if (error) {
          console.log('ERROR: ' + error);
          callback(false);
        } else {
	  //Authenticates successfuly if a row is returned.
          if(rows.length != 0){
            callback(true);
          } else {
            callback(false);
          } 
        }
    });
  });
}

/*
 * Adds a finished game to the WebUI's mySQL database.
 * 
 * @param user1 Player 1's name
 * @param user2 Player 2's name.
 * @param score1 Player 1's score.
 * @param score2 Player 2's score.
 * @param winner Winner's name.
 *
 * Will log an error if it doesn't work.
 */
function addGameDataToSQLDB(user1, user2, score1, score2, winner){
  new mysql.Database({
    hostname: 'localhost',
    user: 'root',
    password: 'sawinrocks',
    database: 'db2'
  }).connect(function(error){
    if (error) {
      return console.log('CONNECTION error: ' + error);
    }
    this.query().insert('GamesPlayed', 
            ['username1', 'username2', 'score1', 'score2', 'win'],
            [user1, user2, score1, score2, winner]
            ).execute(function(error, result) {
              if (error) {
                console.log('ERROR: ' + error);
                  return;
                }
                console.log('GENERATED id: ' + result.id);
             });
           });
}

/*
 * Client class provides a way to organize client information.
 * 
 * @field socket the socket.io reference to the client.
 * @field name the client's username.
 * @field clientType spectator, player, or null (in lobby).
 * @field currentRoom pointer to the current room the player is occupying.
 * @field paddlePos player's paddle position (if playing)
 * @field playerNum player's paddle number (if playing) 
 */
function Client (socket, name) {
  this.socket = socket;
  this.name = name;
  this.clientType;
  this.currentRoom;

  this.paddlePos;
  this.playerNum;

}

/**
 * Sets a client's room to null, effectively leaving the room.
 *
 */
Client.prototype.leaveRoom = function() {
  this.currentRoom = null;
}

/**
 * Room class, provides a means for organizing each individal game, so that
 * multiple games can be played at once! Sadly, the name acts as an ID, but
 * it works, so whatever.
 * 
 * @param name the requested name for the room.
 *
 */
function Room(name) {
  this.name = name;
  console.log("this.name is " + this.name);
  /* Variable declarations */
  this.spectators = new Array();// Spectators
  this.players = new Array();	// Players
  this.numPlayers = 0;		// Number of players currently connected.
  this.gameOn = false;		// Whether or not the game is being played

  /* Game-related variables */
  this.ballPos = []; 		// [ballX, ballY] ball positions.
  this.ballV = []; 		// [ballVX, ballVY] ball velocities.
  this.ballR;			// The ball radius
  this.score = [];		// [scorePlayer1, scorePlayer2] player scores.
  this.fieldSize = []; 		// [fieldX, fieldY] size of the game field.
  this.paddleSize;		// [paddleHeight, paddleWidth]

  /* For mongoDB replay functionality */
  this.rGameID; 		//the gameID that will be queried on replays
  this.rIndex = 0; 		//to track replay docs
  this.rDocs = []; 		//an array of replay docs
}


/**
 * Function called to add player to room.
 * 
 * @param Client object to add.
 *
 */
Room.prototype.joinRoom = function(aClient){
  //Sets 'self' reference.
  var self = this;
  //If the client is a player, give him a paddle ID (0=left, 1=right)
  if(aClient.clientType == 'player'){
    aClient.socket.emit('paddleID', {paddleID: this.players.length});
    console.log("Player " + (this.players.length + 1) + " joined " + "(" + this.name + ")");
    
    //Add him to the players array.
    this.players.push(aClient);
  } 
  
  //If the client is a spectator, just put him on the spectators array.
  else if(client.clientType == 'spectator'){
    this.spectators.push(client);
  }
  
  //If the room has two players, and the game hasn't been started,
  if(this.players.length == 2 && !this.gameOn){
    //Initialize the game, and start the game with a callback that
    //sets it for deletion when the game has completed.
    this.startGame(deleteRoom);

  //If the game has already started and there are two players,
  } else if (this.players.length == 2 && this.gameOn){
    //Give the client the gameInfo so that they can have the names of the players.
    aClient.emit('gameInfo', {names: [this.players[0].name, this.players[1].name]});
  }
}

/**
  * The main game loop, uses setInterval to update ball logic and send out
  * game state packets and update the mongo replay database.
  * @param callback
  *
  */ 
Room.prototype.startGame = function(cb){
    //Sets self reference.
    var self = this;
    
    //Tells players who they're playing!
    io.sockets.in(this.name).emit('gameInfo', {names: [this.players[0].name, this.players[1].name]});
    
    /* Initializing game state variables. */
    this.ballPos = [50,50];
    this.score = [0,0];
    this.fieldSize = [100,100];
    this.ballV = [1,2];
    this.ballR = (1/20)*this.fieldSize[1];
    this.paddleSize = [3,(1/5)*this.fieldSize[1]]; 
    this.players[0].paddlePos = 50;
    this.players[1].paddlePos = 50;

    //Sets callback function.
    var callback = cb;
    self.gameOn = true;
    self.genGameID();  //generating gameID
    
    console.log(this.players[0].name + this.players[1].name);
    var myPlayers = this.players;
    
    //The main game loop.
    var gameInterval = setInterval(function() {
      self.ballLogic(); //Run ball logic simulation.
      self.sendGameState(); //Send game state to all sockets.
      
      //When the game ends, clear the interval (essentially exiting the loop)
      //and call the callback function. Runs at UPDATE_INTERVAL ms.
      if(self.gameOn == false){
        clearInterval(gameInterval);
        callback(gRooms[self.name]);
      }
    }, UPDATE_INTERVAL);
}

/**
 * Sends the Room's current updated game state to all pertinent connected
 * clients (players and spectators).
 * 
 * Also adds information to array on its way to mongoDB replay database.
 * 
 */
Room.prototype.sendGameState = function(){
  //Temporary array to simplify code.
  var paddles = [this.players[0].paddlePos, this.players[1].paddlePos];

  //For every client connected and present in the room, emit a volatile (no ACK required)
  //event with the paddle position data and the ball position data.
  io.sockets.in(this.name).volatile.emit('gameState', {paddle: paddles, ball: this.ballPos});
  
  //Add the index, paddle position data, ball position data, and socre data to the mongo array, and
  //increment the index.
  this.rDocs.push({index: this.rIndex, paddle: paddles,
		   ball: [this.ballPos[0], this.ballPos[1]], scores: [this.score[0], this.score[1]]});
  this.rIndex = this.rIndex + 1; //increment the index
}


/**
  * Sends the room's current score to whoever is present in the room,
  * whether it be players or spectators. Also deals with end-game scenario.
  *
  */
Room.prototype.sendScore = function(){
 //Set a self reference.
 var self = this;

 //Emit a scoreUpdate event to all connected clients with new score.
 io.sockets.in(this.name).emit('scoreUpdate', { score: this.score });
 
 //If the game is over, set a temporary "winner" variable.
 if(this.score[0] == MAXSCORE || this.score[1] == MAXSCORE){
   var winner;
   if(this.score[0] == MAXSCORE){
     winner = this.players[0].name;
   }
   else if(this.score[1] == MAXSCORE){
     winner = this.players[1].name;
   }

   //Send a gameEnd event to everyone.
   console.log("Game " + this.name + " has ended.");
   io.sockets.in(this.name).emit('gameEnd');
   
   //End the game! 
   this.gameOn = false;

   //Add the game to the WebUI team's SQL DB for data processing.
   addGameDataToSQLDB(this.players[0].name, this.players[1].name, this.score[0],
		  this.score[1], winner);

   //Put cached information into mongo database for replays.
   this.emitReplay(); 
  }
}

/*
 * This is the function that calculates the differential in the game state,
 * and it is called once every INTERVAL as determined by the startGame method.
 *
 */
Room.prototype.ballLogic = function(){

    /* Ball bouncing logic */
    if(this.ballPos[1] - this.ballR < 0 || 
       this.ballPos[1] + this.ballR > this.fieldSize[1]){

	 //change gBallPos[1] direction if you go off screen in y direction ....
         this.ballV[1] = -this.ballV[1]; 
     }
    
    /* Paddle Boundary Logic */
    /* Left paddle */
    if(this.ballPos[0] == this.paddleSize[0] &&  	
       //Left paddle's x
       this.ballPos[1] >= this.players[0].paddlePos && 
       this.ballPos[1] <= (this.players[0].paddlePos + this.paddleSize[1])) //Left paddle's y range
       { 
         this.ballV[0] = -this.ballV[0]; //changes x direction
	 this.ballV[1] = this.ballV[1] - 1;
       }
  
     else if(this.ballPos[0] < this.paddleSize[0] &&
       this.ballPos[0] > 0 &&           //X boundary of the edges
       (this.ballPos[1] == this.players[0].paddlePos || 
	//Y boundary
        this.ballPos[1] == (this.players[0].paddlePos + this.paddleSize[1]))){ //top and bottom of left paddle
          this.ballV[1] = -this.ballV[1]; //changes y direction
       }
    
  
    /* Right paddle */
    if(this.ballPos[0] == this.fieldSize[0] - this.paddleSize[0] && //Right paddle's x
       this.ballPos[1] >= this.players[1].paddlePos &&
       this.ballPos[1] <= (this.players[1].paddlePos + this.paddleSize[1])) //Right paddle's y range
      { 
         this.ballV[0] = -this.ballV[0]; // changes x direction
      }
  
    else if(this.ballPos[0] > this.fieldSize[0] - this.paddleSize[0] &&
            this.ballPos[0] < this.fieldSize[0] &&               //X boundary of the edges
           (this.ballPos[1] == this.players[1].paddlePos || 
            this.ballPos[1] == (this.players[1].paddlePos + this.paddleSize[1])) //Y boundary of the edges
           ){ //top and bottom of right paddle
  	      this.ballV[1] = -this.ballV[1]; // changes y direction
  	    }
    
    
    // if ball goes out of frame reset in the middle and put to default speed and increment gScore...
    if(this.ballPos[0] + this.ballR < 0){
      //changed these numbers -- ball was going super far out of frame 
      this.ballPos[0] = this.fieldSize[0]/2;

      //Randomize starting y position to account for boundary issues
      this.ballPos[1] = Math.floor(Math.random()*(this.fieldSize[1]-2))+1; 
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
    if(this.ballPos[0] + this.ballR > this.fieldSize[0] + 10){
      this.ballPos[0] = this.fieldSize[0]/2;
      this.ballPos[1] = Math.floor(Math.random()*(this.fieldSize[1]-2))+1; 
      this.ballV[0] = 1;
      //random direction variable(1 or 0)       
      var dir = Math.floor(Math.random()*2);
      if(dir == 0){
      	dir = -2;//ball direction is up
      }else{
	dir = 2;//ball direction is down
      }
      this.ballV[1] = dir;
      this.score[0] = this.score[0] + 1;
      
      //Sends score.
      this.sendScore();
    }
    
    //Updates ball position based on velocity.
    this.ballPos[0]+=this.ballV[0];
    this.ballPos[1]+=this.ballV[1];
}


/*
 * Generates game ID based on UTC
 */
Room.prototype.genGameID = function(){
  //Temporarily using unix time for gameID - highly unlikely to have duplicates
  var foo = new Date;
  var unixtime = parseInt(foo.getTime());
  this.rGameID = unixtime;
}

/**
  * Emits current cached game information to mongodb replay database.
  */
Room.prototype.emitReplay = function(){
  //Simply putting the array into the database
  rDB.replays.save({gameID: this.rGameID, replayDocs: this.rDocs});
}
