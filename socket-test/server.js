/* Server.js for Vir-Pong, Inc as drafted by Daniel Guilak */

//Require the express framework (which creates a server)
var app = require('express').createServer(),
//and socket.io which provides websocket support.
    sio = require('socket.io');

//when someone requests / on the webserver, send them a small script
//that will aid them in connecting to the server.
app.get('/', function(req, res){
  //This is all client-side now
  res.send('<script src="/socket.io/socket.io.js"></script>\
<script>\
  var socket = io.connect("http://10.150.1.204");\
  socket.on("news", function (data) {\
    alert(data.hello);\
  });\
  var myData = prompt("Get data!");\
  socket.emit("news", { hello: myData });\
</script>');
});

//set the server to listen on port
app.listen(3000);

//set the sockets to listen on same port.
var io = sio.listen(app);

//when someone connects
io.sockets.on('connection', function (socket) {
  //emit some news
  //socket.emit('news', { hello: 'world' });
  //when I receive some news, put it in the console.
  socket.on('user-message', function(data) {
     console.log(data.data);
     socket.emit('news', 'Juicy gossip: ' + data.data);
  });
});
