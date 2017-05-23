var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
var util = require('util');
var fs = require('fs');
app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);

var factory = require('./server/factory.js');
var utils = require('./server/utils.js');
var messenger = require('./server/messenger.js');
var hostess = require('./server/hostess.js');
var database = require('./server/database.js');
var c = require('./server/config.json');

var userRegex = new RegExp('^[a-zA-Z0-9_-]{3,15}$');
var passRegex = new RegExp('^[a-zA-Z0-9_-]{6,20}$');
var gameNameRegex = new RegExp('^[a-zA-Z0-9_-]{3,10}$');

//Base Server Settings
var serverSleeping = true,
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
	client.emit("welcome",client.id);
	messenger.addMailBox(client.id,client);

	client.on('register',function(creds){
		logToFile('/logs/reg_attempts.txt',creds.username + " : " + client.handshake.address + '\n');
		creds.id = client.id;
		checkReg(creds);
	});

	client.on('auth',function(creds){
		logToFile('/logs/auth_attempts.txt',creds.username + " : " + client.handshake.address + '\n');
		creds.id = client.id;
		checkAuth(creds);
	});

	client.on('disconnect', function() {
		if(database.findAuthedUser(client.id) != null){
			database.removeAuthedUser(client.id);
		}
		hostess.kickFromRoom(client.id);
		//This is removing connection to the client, make sure this is the final thing we do for that client
		messenger.removeMailBox(client.id);

		if(hostess.getRoomCount() == 0){
			serverSleeping = true;
			clearInterval(serverUpdates);
			console.log("Server sleeping..");
		}
  	});

	if(serverSleeping){
		serverSleeping = false;
		console.log("Server wakeup");
		serverUpdates = setInterval(update,serverTickSpeed);
	}
});

//Gamestate updates
function update(){
	if(!serverSleeping){
		hostess.updateRooms();
	}
}

function checkAuth(creds){
	if(invalid(creds.username,creds.password)){
		messenger.messageUser(creds.id,"unsuccessfulAuth",{reason:"Invalid attempt"});
		return;
	}
	database.lookupUser(authCallback,creds);
}
function authCallback(result,params){
	if(result == undefined){
		messenger.messageUser(params.id,'unsuccessfulAuth',{reason:"Player not found"});
		return;
	}
	messenger.messageUser(params.id,'successfulAuth',result[0]);
}

function invalid(user,pass){
    if(user == null || user == ""){
        return true;
    }
    if(pass == null || pass == ""){
        return true;
    }
    if(userRegex.test(user) == false){
        return true;
    }
    if(passRegex.test(pass) == false){
        return true;
    }
}

function simpleChecks(creds){
	var user = creds.username;
	var pass = creds.password;
	var gameName = creds.gamename;

	if(user == null || user == ""){
		messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"User is empty"});
        return true;
    }
    if(userRegex.test(user) == false){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"User is invalid"});
        return true;
    }
    if(pass == null || pass == ""){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"Password is empty"});
        return true;
    }
    if(passRegex.test(pass) == false){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"Password is invalid"});
        return true;
    }
    if(gameName == null || gameName == ""){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"Callsign is empty"});
        return true;
    }
    if(gameNameRegex.test(gameName) == false){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"Callsign is invalid"});
        return true;
    }
    return false;
}

function checkReg(creds){
	if(simpleChecks(creds)){
		return;
	}
	database.createUser(regCallback,creds);
}

function regCallback(result,params){
	if(result.insertId == undefined){
		messenger.messageUser(params.id,'unsuccessfulReg',{reason:"Failed to register"});
		return;
	}
	database.addAuthedUser(params.id,result.insertId);
	messenger.messageUser(params.id,'successfulReg',params.player);
}

function logToFile(fileLoc,content){
	fs.appendFile(__dirname + fileLoc, content);
}