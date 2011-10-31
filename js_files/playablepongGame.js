var canvas;  
var ctx;
var dataList; 

// Coords halved to start in middle of field
var x = 380;
var y = 150;
// Movement variables
var dx = 2;
var dy = 4;
// Paddle shape
var paddleHeight = 235;
var paddleWidth = 20;
// Canvas dimensions
var WIDTH = 640;
var HEIGHT = 480;
var OFFSETRT = 0; //the off set of canvas to the right
var OFFSETTOP = 0; // the off set of the canvas from the top
 
// KeyCode variables for keyboard input
// Paddle one
var left = 37;
var right = 39;
var up = 38;
var down = 40;
var arrowYPos = 150;
var ARROWXPOS = WIDTH - paddleWidth;
var p1Score;
// Paddle two
var qwertyA = 65;
var qwertyS = 83;
var qwertyD = 68;
var qwertyW = 87;
var yPos = 150;
var XPOS = 0;
var p2Score;

var time; //game time
var timeInc = 10; //increment for calling init function and recording time
var timeLimit;
var scoreLimit;
var gameOver;

//draws the Ball
//takes x and y coord for parameters
function circle(cx,cy) {
	ctx.beginPath();
	ctx.moveTo(cx, cy);
	ctx.arc(cx, cy, 11, 0, Math.PI*2, false);
	ctx.closePath();
	ctx.fill();
}

 
// Added in - Paddle 1
function paddle1(x,y){
  ctx.beginPath();
  ctx.rect(x,y,paddleWidth, paddleHeight);
  ctx.closePath();
  ctx.fill();
}
 
// Added in - Paddle 2
function paddle2(arrowX,arrowY){
  ctx.beginPath();
  ctx.rect(arrowX,arrowY,paddleWidth, paddleHeight);
  ctx.closePath();
  ctx.fill();
}
 
 // Draws the canvas
function rect(x,y,w,h) {
  ctx.beginPath();
  ctx.rect(x,y,w,h);
  ctx.closePath();
  ctx.fill();
}
 
 
function clear() {
  ctx.clearRect(0, 0, WIDTH +500, HEIGHT +500); //+500 fixes the ball erase problem of canvas
}
 
function draw(){
  drawBall();
  drawPlayers();
  return dataList;
}
function init() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  time +=timeInc; 
  return setInterval(draw, timeInc);
}

 
function drawPlayers(){
 
  ctx.fillStyle = "WHITE";//player left
  paddle2(XPOS, yPos);
  
  ctx.fillStyle = "#7F3AF8"; //player right
  paddle1(ARROWXPOS,arrowYPos);
   window.onkeydown = function(e){
 
	// Keyboard input
	var keyCode = e.keyCode;

	if(keyCode == qwertyW && yPos> 20){
		yPos -= 10;
	}
	if(keyCode == qwertyS && yPos< HEIGHT - paddleHeight){
		yPos += 10;
	}
        if(keyCode == up && arrowYPos > 20){
		arrowYPos -= 10;
	}

	if(keyCode == down &&  arrowYPos < HEIGHT - paddleHeight){
		arrowYPos += 10;
	}
 
  };
  dataList[0] = yPos;
  dataList[1] = arrowYPos;
  

}


function drawBall() {
  clear();
 
  ctx.fillStyle = "BLACK"; //color of canvas
  rect(0,0,WIDTH,HEIGHT); //Draws canvas
  
  //draws ball. Takes the x and y coord as parameters
  ctx.fillStyle = "WHITE";
  circle(x,y);
  if(ifHit){
    ifHit();
  }
  if(x == OFFSETRT){
      x = 500;
  }
  if(x == WIDTH){
      x = 100;
  }
  if(x + dx > WIDTH){
    x = 100;
    dx = -dx;
    p1Score +=1;
  }
  else if(x + dx < 0){
       x = 100;
       dx = -dx;
       p2Score += 1;
  }
  if (y + dy > HEIGHT || y + dy < 0){
    dy = -dy;
  }
  x += dx;
  y += dy;
}
/**
ifHit checks to see if the ball comes in contact with the paddle's coordinates 
and changes its direction accordingly.  
*/
function ifHit(){
  if(x == XPOS + paddleWidth){ //checks if the ball is in the paddle1's range of x coordinates
    if(y >= yPos && y <= yPos+paddleHeight){ //checks if the ball is also in the paddle's y coordinates and if so deflects it. 
      dx = -dx; //ball x direction is reversed
    }
  }
  else if(x >= XPOS && x<= XPOS + paddleWidth){
    if(y == yPos || y == yPos + paddleHeight){ //top and bottom edge
       dy = -dy;
       dx = -dx;
    }
  }
  if(x == ARROWXPOS){ //checks if the ball is in the paddle2's range of x coordinates
      if(y >= arrowYPos && y <= arrowYPos + paddleHeight){ //checks if the ball is also in the paddle's y coordinates and if so deflects it.
         dx = -dx; //ball x direction is reversed
      }
  }
  else if(x >= ARROWXPOS && x <= ARROWXPOS + paddleWidth){ 
    if(y == arrowYPos || y == arrowYPos + paddleHeight ){ //top and bottom edge
       dy = -dy;
       dx = -dx;
    }
  }
  return true;
}
 
init();
 