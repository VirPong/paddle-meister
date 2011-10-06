var app = require('express').createServer(),
    sio = require('socket.io');

app.get('/', function(req, res){
  res.send('<script src="/socket.io/socket.io.js"></script>\
<script>\
  var socket = io.connect("http://10.150.1.204");\
  socket.on("news", function (data) {\
    alert(data.hello);\
  });\
</script>');
});

app.listen(3000);

var io = sio.listen(app);

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
});
