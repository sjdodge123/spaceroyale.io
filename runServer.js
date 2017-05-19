var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');

app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var mysql = require('mysql');
var factory = require('./server/factory.js');
var utils = require('./server/utils.js');
var c = require('./server/config.json');

var database = mysql.createConnection({
	host: c.sqlinfo.host,
	user: c.sqlinfo.user,
	password : c.sqlinfo.password,
	database : c.sqlinfo.database,
	debug : c.sqlinfo.debug
});
var userRegex = new RegExp('^[a-zA-Z0-9_-]{3,15}$');
var passRegex = new RegExp('^[a-zA-Z0-9_-]{6,20}$');

//Base Server Settings
var serverSleeping = true,
	serverTickSpeed = c.serverTickSpeed,
	serverUpdates = null,
	result = [],
	authedUserList = {};

//Room settings
var roomList = {},
	maxPlayersInRoom = c.maxPlayersInRoom,
	roomKickTimeout = c.roomKickTimeout;

//Base Server Functions
server.listen(c.port,c.host, function(){
	utils.build(io);
	connectToDB();
	//addNewUser({user_name:'sdodge',password:'password',total_exp:'0'});
    console.log('listening on '+c.host+':'+c.port);
});

process.on( 'SIGINT', function() {
	  console.log( "\nServer shutting down from (Ctrl-C)" );
	  io.sockets.emit("serverShutdown","Server terminated");
	  process.exit();
});

process.on('SIGUSR2', function () {
  	console.log( "\nServer restarting" );
	io.sockets.emit("serverShutdown","Server restarted");
	process.exit();
});

process.on('exit', function(){
	console.log( "\nServer shutting down from terminate" );
	io.sockets.emit("serverShutdown","Server terminated");
	process.exit();
});

process.on('uncaughtException',function(e){
	console.log( "\nServer shutting down from unhandled exception:\n\n"+ e);
	io.sockets.emit("serverShutdown","Server terminated");
	process.exit();
});

io.on('connection', function(client){
	client.emit("welcome",client.id);

	utils.addMailBox(client.id,client);

	client.on('auth',function(creds){
		//TODO log all auth attempts into a log file for security
		creds.id = client.id;
		if(invalidAuth(creds)){
			client.emit("unsuccessfulAuth");
		}
	});

	client.on('enterLobby', function(message){

		//Find a room with space
		var roomSig = findARoom(client.id);
		var room = roomList[roomSig];
		utils.addRoomToMailBox(client.id,roomSig);

		room.join(client);
		console.log(message.name + " connected to Room"+roomSig);

		//Add this player to the list of current clients in the room
		room.clientList[client.id] = message.name; 

		//Spawn a ship for the new player
		room.shipList[client.id] = room.world.spawnNewShip(client.id,message.color);

		//Send the current gamestate to the new player
		var gameState = {
			playerList:room.clientList,
			shipList:room.shipList,
			world:room.world
		};
		client.emit("gameState" , gameState);

		//Update all existing players with the new player's info
		var appendPlayerList = {
			name:message.name,
			id:client.id,
			ship:room.shipList[client.id]
		};
		client.broadcast.to(roomSig).emit("playerJoin",appendPlayerList);
	});

	client.on('disconnect', function() {
		var room = locateMyRoom(client.id);
		if(room == undefined){
			return;
		}
		var name = room.clientList[client.id];
		var id = client.id;
		utils.removeMailBox(id);
		client.broadcast.to(room.sig).emit('playerLeft',client.id);
		console.log(name + ' disconnected from Room' + room.sig);
		room.leave(client);
		delete room.clientList[id];
		delete room.shipList[id];

		if(getActiveRoomCount() == 0){
			serverSleeping = true;
			clearInterval(serverUpdates);
			console.log("Server sleeping..");
		}
  	});

  	client.on('signout',function(){
  		client.emit('successfulSignout');
  		delete authedUserList[client.id];
  	});

	client.on('movement',function(packet){
		var room = locateMyRoom(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship != null){
			ship.moveForward = packet.moveForward;
			ship.moveBackward = packet.moveBackward;
			ship.turnLeft = packet.turnLeft;
			ship.turnRight = packet.turnRight;
		}
	});

	client.on('mousemove',function(loc){
		var room = locateMyRoom(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship != null && ship != undefined){
			ship.angle = (180/Math.PI)*Math.atan2(loc.y-ship.y,loc.x-ship.x)-90;
		}
	});
	

	client.on('click',function(loc){
		//if bullet should be spawned (could be clicking something else)
		fireWeapon(client.id);
	});

	if(serverSleeping){
		serverSleeping = false;
		console.log("Server wakeup");
		serverUpdates = setInterval(update,serverTickSpeed);
	}
});

function locateMyRoom(id){
	var room;
	for(var sig in roomList){
		if(roomList[sig].checkRoom(id)){
			room = roomList[sig];
		}
	}
	return room;
}

function getActiveRoomCount(){
	var activeRooms = 0;
	for(var sig2 in roomList){
		if(roomList[sig2].clientCount == 0){
			delete roomList[sig2];
		} else{
			activeRooms++;
		}
	}
	return activeRooms;
}

function findARoom(clientID){
	if(getRoomCount() == 0){
		var sig = generateRoomSig();
		roomList[sig] = factory.getRoom(sig,maxPlayersInRoom);
		return sig;
	}
	for(var sig2 in roomList){
		if(roomList[sig2].hasSpace()){
			return sig2;
		}
	}
	var sig3 = generateRoomSig();
	roomList[sig3] = factory.getRoom(sig3,maxPlayersInRoom);
	return sig3;
}

function getRoomCount(){
	var count = 0;
	for(var sig in roomList){
		count++;
	}
	return count;
}

function reclaimRoom(sig){
	io.to(sig).emit("serverShutdown","Server has closed your session");
}

//Gamestate updates
function update(){
	if(!serverSleeping){
		for(var sig in roomList){
			var room = roomList[sig];
			if(!room.game.gameEnded){
				updateRoom(room);
			} else{
				io.to(room.sig).emit("gameOver",room.game.winner);
				setTimeout(reclaimRoom,roomKickTimeout*1000,room.sig);	
			}
		}
	}
}

function updateRoom(room){
	room.update();

	//Send messages about ships death
	for(var shipID in room.shipList){
		var ship = room.shipList[shipID];
		if(ship.alive == false){
			room.game.gameBoard.spawnItem(ship.weapon.drop(ship.x,ship.y));
			if(ship.killedBy != null){
				var murderer = room.shipList[ship.killedBy];
				var murdererName = room.clientList[ship.killedBy];
				var deadPlayerName = room.clientList[shipID];
				murderer.killList.push(deadPlayerName);
				utils.sendEventMessageToRoom(murderer.id,murdererName + " killed " + deadPlayerName);
				utils.toastPlayer(murderer.id,"You killed " + deadPlayerName);
			}
			io.to(room.sig).emit('shipDeath',shipID);
			delete room.shipList[shipID];
		}
	}
	
	io.to(room.sig).emit("movementUpdates",{
		shipList:room.shipList,
		bulletList:room.bulletList,
		asteroidList:room.asteroidList,
		planetList:room.planetList,
		itemList:room.itemList,
		world:room.world,
		state:room.game.active,
		lobbyTimeLeft:room.game.lobbyTimeLeft,
		totalPlayers:utils.getTotalPlayers(),
		shrinkTimeLeft:room.game.timeLeftUntilShrink});
}
function fireWeapon(id){
	var room = locateMyRoom(id);
	if(room == undefined){
		return;
	}
	var ship = room.shipList[id];
	room.game.gameBoard.fireWeapon(ship);
}
function generateRoomSig(){
	var sig = getRandomInt(0,99999);
	if(roomList[sig] == null || roomList[sig] == undefined){
		return sig;
	}
	sig = generateRoomSig();
}

function invalidAuth(creds){
	if(invalid(creds.username,creds.password)){
		return true;
	}
	lookupUser(checkPassword,creds);
	return false;
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

function connectToDB(){
	database.connect(function(e){
		if(e){
			throw e;
		}
		console.log("Connected to database");
	})
}
function sendQuery(value){
	database.query(value,function(e,result){
		if(e){
			throw e;
		}
		return result;
	});
}

function addNewUser(user){
	database.query("INSERT INTO queenanne.user SET ?",mysql.escape(user),function(e,result){
		if(e){
			throw e;
		}
		console.log(result);
	});
}

function lookupUser(callback,params){
	database.query("SELECT * FROM queenanne.user WHERE user_name LIKE ?",params.username,function(e,result){
		if(e){
			throw e;
		}
		callback(result,params);
	});
}

function checkPassword(result,params){
	if(result.length == 0){
		utils.messageUser(params.id,'unsuccessfulAuth');
		return;
	}
	if(result[0].password === params.password){
		authedUserList[params.id] = result[0].user_id;
		utils.messageUser(params.id,'successfulAuth',{playerName:'D3s7iny'});
		return;
	}
	utils.messageUser(params.id,'unsuccessfulAuth');
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}