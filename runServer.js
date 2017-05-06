var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(3000, function(){
  console.log('listening on *:3000');
});

io.on('connection', function(client){
	client.emit("welcome");
	client.on('gotit', function(name){
		console.log(name + " connected");
		client.broadcast.emit("playerJoin",name);
	});
});