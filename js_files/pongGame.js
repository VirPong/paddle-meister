var canvas;  
var ctx;
// x,y Coords Player 1
// var x = 400;
// var y = 300;
// Coords halved to start in middle of field
var x = 380;
var y = 150;
// x,y Coords Player 2
//var qwertyX = 0;
//var qwertyY = 0;
var qwertyX = 10;
var qwertyY = 150;
// Movement variables
var dx = 2;
var dy = 4;
// Paddle shape
var paddleHeight = 45;
var paddleWidth = 20;
// Canvas dimensions
var WIDTH = 400;
var HEIGHT = 300; 
 
// KeyCode variables for keyboard input
// Paddle one
var left = 37;
var right = 39;
var up = 38;
var down = 40;
// Paddle two
var qwertyA = 65;
var qwertyS = 83;
var qwertyD = 68;
var qwertyW = 87;
var yPos = 150;


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
function paddle2(qwertyX,qwertyY){
  ctx.beginPath();
  ctx.rect(qwertyX,qwertyY,paddleWidth, paddleHeight);
  ctx.closePath();
  ctx.fill();
}
 
 
function rect(x,y,w,h) {
  ctx.beginPath();
  ctx.rect(x,y,w,h);
  ctx.closePath();
  ctx.fill();
}
 
 
function clear() {
  ctx.clearRect(0, 0, WIDTH + 500, HEIGHT +500); //+500 fixes the ball erase problem of canvas
}
 
function initBall() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  return setInterval(drawBall, 10);
}

function initPlayers(){
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  return setInterval(drawPlayers,10);
}
 
function drawPlayers(){
 
  ctx.fillStyle = "#1A7F93";
  paddle2(qwertyX, yPos);
   window.onkeydown = function(e){
 
	// Keyboard input
	var keyCode = e.keyCode;

	if(keyCode == qwertyW && yPos>20){
		yPos = yPos - 10;
	}
	if(keyCode == qwertyS && yPos<275){
		yPos = yPos + 10;
	}
 
  };

}


function drawBall() {
  clear();
 
  ctx.fillStyle = "BLACK";
  rect(10,20,WIDTH,HEIGHT);
  
  //draws ball. Takes the x and y coord as parameters
  ctx.fillStyle = "WHITE";
  circle(x,y);
 
  if (x + dx > WIDTH || x + dx < 0)
    dx = -dx;
  if (y + dy > HEIGHT || y + dy < 0)
    dy = -dy;
 
  x += dx;
  y += dy;
}
 
initBall();
initPlayers();
 