var canvas;  
var ctx;
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
var arrowXPos = 550;
// Paddle two
var qwertyA = 65;
var qwertyS = 83;
var qwertyD = 68;
var qwertyW = 87;
var yPos = 150;
var xPos = 50;


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
}
function init() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  return setInterval(draw, 10);
}

 
function drawPlayers(){
 
  ctx.fillStyle = "WHITE";//player left
  paddle2(xPos, yPos);
  
  ctx.fillStyle = "#7F3AF8"; //player right
  paddle1(arrowXPos,arrowYPos);
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
  if(x + dx > WIDTH || x + dx < 0){
    x = 100;
    dx = -dx;
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
  if(x == xPos + paddleWidth){ //checks if the ball is in the paddle's range of x coordinates
    if(y >= yPos && y <= yPos+paddleHeight){ //checks if the ball is also in the paddle's y coordinates and if so deflects it. 
      dx = -dx; //ball x direction is reversed
    }
  }
    if(x == arrowXPos){ //checks if the ball is in the paddle's range of x coordinates
      if(y >= arrowYPos && y <= arrowYPos + paddleHeight){ //checks if the ball is also in the paddle's y coordinates and if so deflects it.
         dx = -dx; //ball x direction is reversed
      }
    }
  return true;
}
 
init();
 