var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
var util = require('util');

app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling'] }).listen(server);
var factory = require('./server/factory.js');
var utils = require('./server/utils.js');
var c = utils.loadConfig();
var messenger = require('./server/messenger.js');
var hostess = require('./server/hostess.js');
var database = require('./server/database.js');
var bouncer = require('./server/bouncer.js');


//Base Server Settings
var serverSleeping = true,
    pendingReboot = false,
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
	utils.logToFile('logs/connections.txt',client.handshake.address + ' connected');
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
		utils.logToFile('logs/connections.txt',client.handshake.address + ' disconnected');
		checkForSleep();
  	});


});

//Gamestate updates
function update(){
    if(serverSleeping){
        return;
    }
	var dt = utils.getDT();
	hostess.updateRooms(dt);
    if(pendingReboot == false){
        //25000000
        var heapUsed = process.memoryUsage().heapUsed;
        if(heapUsed > 40000000){
            console.log("Performing Emergency reboot Memory Critical " + heapUsed);
            reboot();
        } else if(heapUsed > 32500000){
            console.log("Pending reboot.. Memory currently at " + heapUsed);
            pendingReboot = true;
        }
    }
}

function checkForWake(){
	if(serverSleeping){
        console.log("Server wake");
    	utils.getDT();
		serverSleeping = false;
		utils.logToFile('logs/connections.txt',"Server wakeup");
		serverUpdates = setInterval(update,serverTickSpeed);
	}
}

function reboot(){
    console.log("Server rebooting.....");
    utils.logToFile('logs/connections.txt',"Server force reboot. Ran for " + process.uptime() / 60 / 60 + " hours");
    process.exit(1);
}

function checkForSleep(){
	if(clientCount == 0){
        if(pendingReboot){
            reboot();
        }
        console.log("Server sleep ZZZ..");
		serverSleeping = true;
		clearInterval(serverUpdates);
		utils.logToFile('logs/connections.txt',"Server sleep");
	}
}
