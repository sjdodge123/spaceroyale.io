var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
var util = require('util');

app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);

var factory = require('./server/factory.js');
var utils = require('./server/utils.js');
var messenger = require('./server/messenger.js');
var hostess = require('./server/hostess.js');
var database = require('./server/database.js');
var bouncer = require('./server/bouncer.js');
var c = require('./server/config.json');



//Base Server Settings
var serverSleeping = true,
	clientCount = 0,
	serverTickSpeed = c.serverTickSpeed,
	serverUpdates = null,
	result = [];

//Base Server Functions
server.listen(c.port,c.host, function(){
	messenger.build(io);
	
    console.log('listening on '+c.host+':'+c.port);
});

process.on( 'SIGINT', function() {
	  console.log( "\nServer shutting down from (Ctrl-C)" );
	  io.sockets.emit("serverShutdown","Server terminated");
	  process.exit();
});

io.on('connection', function(client){
	checkForWake();
	utils.logToFile('logs\\connections.txt',client.handshake.address + ' connected');
	clientCount++;
	messenger.addMailBox(client.id,client);
	client.on('disconnect', function() {
		if(database.findAuthedUser(client.id) != null){
			database.removeAuthedUser(client.id);
		}
		hostess.kickFromRoom(client.id);
		//This is removing connection to the client, make sure this is the final thing we do for that client
		messenger.removeMailBox(client.id);
		clientCount--;
		utils.logToFile('logs\\connections.txt',client.handshake.address + ' disconnected');
		checkForSleep();
  	});

	
});

//Gamestate updates
function update(){
	if(!serverSleeping){
		hostess.updateRooms();
	}
}

function checkForWake(){
	if(serverSleeping){
		serverSleeping = false;
		utils.logToFile('logs\\connections.txt',"Server wakeup");
		serverUpdates = setInterval(update,serverTickSpeed);
	}
}

function checkForSleep(){
	
	if(clientCount == 0){
		serverSleeping = true;
		clearInterval(serverUpdates);
		utils.logToFile('logs\\connections.txt',"Server sleep");
	}
}

