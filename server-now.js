var html = require('fs').readFileSync('/home/serv/nowtest/helloworld.html');
var server = require('http').createServer(function(req, res){
  res.end(html);
});
server.listen(3000);

var nowjs = require("now"); 
var everyone = nowjs.initialize(server);

var users = [];
var gameOn = false;
nowjs.on('connect', function() {
  users[this.user.clientId] = {paddle: 0};
  if(users.length == 2 && !gameOn){
    gameOn = true;
    startGame(); 
  }
});

nowjs.on('disconnect', function() {
  //Make sure to notify everyone else at some point.
  for(var i in users) {
    if(i == this.user.clientId) {
      delete users[i];
      break;
    }
  }
});

everyone.now.updatePaddle = function(paddle) {
  actors[this.user.clientId].paddle = paddle;
}

everyone.now.gameX = 100;
everyone.now.gameY = 100;
everyone.now.rightPad = everyone.now.gameY/2;
everyone.now.leftPad = everyone.now.gameY/2;
everyone.now.paddleWidth = 10;
everyone.now.paddleHeight = everyone.now.gameY/5;
everyone.now.motionStep = 10;
everyone.now.xBall = everyone.now.gameX/2;
everyone.now.yBall = everyone.now.gameY/2;
everyone.now.ballR = everyone.now.gameX/20;
everyone.now.scoreLeft = 0;
everyone.now.scoreRight = 0;

var gBallV = [1,2];

function ballLogic(){

  //Ball bouncing logic
  
  if( everyone.now.ballY<0 || everyone.now.ballY>gFieldSize[1]){
    gBallV[1] = -gBallV[1]; //change everyone.now.ballY direction if you go off screen in y direction ....
  }
  
  // Paddle Boundary Logic
  
  // changed all these numbers to more reasonable also, these kinda stuff should also be fields but we can
  // think about that later
  
  if((everyone.now.ballX == 10) && (everyone.now.ballY > everyone.now.paddleLeft - 3) && (everyone.now.ballY < (everyone.now.paddleLeft + gPaddleSize[0] + 3))){ //if it hits the left paddle
    gBallV[0] = -gBallV[0]; //get faster after you hit it
  }
  if((everyone.now.ballX == gFieldSize[0] - 10) && (everyone.now.ballY > everyone.now.paddleRight - 3) && (everyone.now.ballY < (everyone.now.paddleRight + gPaddleSize[0] + 3))){ //if it hits the right paddle
    gBallV[0] = -gBallV[0];
  }
  
  // if ball goes out of frame reset in the middle and put to default speed and increment gScore...
  
  if(everyone.now.ballX < -10){ //changed these numbers you had old ones so ball was going super far out of frame
    everyone.now.ballX = gFieldSize[0]/2;
    everyone.now.ballY = gFieldSize[1]/2;
    gBallV[0] = 1;
    gBallV[1] = 2;
    everyone.now.scoreRight = everyone.now.scoreRight + 1;
  }
  if(everyone.now.ballX >gFieldSize[0] +10 ){ //changed these numbers you had old ones so ball was going super far out of frame
    everyone.now.ballX = gFieldSize[0]/2;
    everyone.now.ballY = gFieldSize[1]/2;
    gBallV[0] = 1;
    gBallV[1] = 2;
    everyone.now.scoreLeft = everyone.now.scoreLeft + 1; 
  }
  
  everyone.now.ballX+=gBallV[0];
  everyone.now.ballY+=gBallV[1];
}

/* This is the main game loop that is set to run every 50 ms. */
function startGame(){
setInterval(function() {
    ballLogic(); //Run ball logic simulation.
  }, 50);
}

