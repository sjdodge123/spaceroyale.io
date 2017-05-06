var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(3000, function(){
  console.log('listening on *:3000');
});


io.on('connection', function(socket){
	console.log("Player connected");
});