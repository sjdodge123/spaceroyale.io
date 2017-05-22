var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
var util = require('util');
var fs = require('fs');
app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var mysql = require('mysql');
var factory = require('./server/factory.js');
var utils = require('./server/utils.js');
var c = require('./server/config.json');

var database = null;
var userRegex = new RegExp('^[a-zA-Z0-9_-]{3,15}$');
var passRegex = new RegExp('^[a-zA-Z0-9_-]{6,20}$');
var gameNameRegex = new RegExp('^[a-zA-Z0-9_-]{3,10}$');

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
	
    console.log('listening on '+c.host+':'+c.port);
});

process.on( 'SIGINT', function() {
	  console.log( "\nServer shutting down from (Ctrl-C)" );
	  io.sockets.emit("serverShutdown","Server terminated");
	  process.exit();
});
/*
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
	console.log(e);
	io.sockets.emit("serverShutdown","Server terminated");
	process.exit();
});
*/

io.on('connection', function(client){
	client.emit("welcome",client.id);
	utils.addMailBox(client.id,client);

	client.on('register',function(creds){
		//TODO log all reg attempts into a log file for security
		creds.id = client.id;
		checkReg(creds);
	});

	client.on('auth',function(creds){
		logToFile('/logs/auth_attempts.txt',creds.username + " : " + client.handshake.address + '\n');
		creds.id = client.id;
		checkAuth(creds);
	});

	client.on('enterLobby', function(message){

		//Find a room with space
		var roomSig = findARoom(client.id);
		var room = roomList[roomSig];
		room.join(client.id);
		console.log(message.name + " joined Room"+roomSig);

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

	client.on('playerLeaveRoom',function(){
		kickFromRoom(client.id);
	});

	client.on('disconnect', function() {
		if(authedUserList[client.id] != null){
			delete authedUserList[client.id];
		}
		kickFromRoom(client.id);
		//This is removing connection to the client, make sure this is the final thing we do for that client
		utils.removeMailBox(client.id);

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

function kickFromRoom(clientID){
	var room = locateMyRoom(clientID);
	if(room != undefined){
		room.leave(clientID);
	}
}

function getRoomCount(){
	var count = 0;
	for(var sig in roomList){
		count++;
	}
	return count;
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
				setTimeout(room.reclaim,roomKickTimeout*1000);	
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
			delete room.shipList[shipID];
			io.to(room.sig).emit('shipDeath',shipID);
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
		shrinkTimeLeft:room.game.timeLeftUntilShrink
	});
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

function checkAuth(creds){
	if(invalid(creds.username,creds.password)){
		utils.messageUser(creds.id,"unsuccessfulAuth",{reason:"Invalid attempt"});
		return;
	}
	lookupUser(authCallback,creds);
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
		utils.messageUser(creds.id,'unsuccessfulReg',{reason:"User is empty"});
        return true;
    }
    if(userRegex.test(user) == false){
        utils.messageUser(creds.id,'unsuccessfulReg',{reason:"User is invalid"});
        return true;
    }
    if(pass == null || pass == ""){
        utils.messageUser(creds.id,'unsuccessfulReg',{reason:"Password is empty"});
        return true;
    }
    if(passRegex.test(pass) == false){
        utils.messageUser(creds.id,'unsuccessfulReg',{reason:"Password is invalid"});
        return true;
    }
    if(gameName == null || gameName == ""){
        utils.messageUser(creds.id,'unsuccessfulReg',{reason:"Callsign is empty"});
        return true;
    }
    if(gameNameRegex.test(gameName) == false){
        utils.messageUser(creds.id,'unsuccessfulReg',{reason:"Callsign is invalid"});
        return true;
    }
    return false;
}

function checkReg(creds){
	if(simpleChecks(creds)){
		return;
	}
	createUser(regCallback,creds);
}

function createConnection(){
	database = mysql.createConnection({
		host: c.sqlinfo.host,
		user: c.sqlinfo.user,
		password : c.sqlinfo.password,
		database : c.sqlinfo.database,
		debug : c.sqlinfo.debug
	});
}

function sendQuery(value){
	database.query(value,function(e,result){
		if(e){
			throw e;
		}
		return result;
	});
}

function createUser(callback,params){
	var user = {user_name:params.username,password:params.password};
	var player = {user_id:null,total_exp:0,total_kills:0,total_wins:0,game_name:params.gamename,skin_id:0};
	createConnection();
	database.connect(function(e){
		if(e){
			throw e;
		}
		database.query("SELECT * FROM queenanne.user WHERE user_name LIKE ?",params.username,function(e,result){
			if(e){
				throw e;
			}
			if(result.length != 0){
				utils.messageUser(params.id,'unsuccessfulReg',{reason:"Username is taken"});
				return;
			}
			database.query("INSERT INTO queenanne.user SET ?",user,function(e,result){
				if(e){
					throw e;
				}
				player.user_id = result.insertId;
				database.query("INSERT INTO queenanne.player SET ?",player,function(e,result){
					if(e){
						throw e;
					}
					params.player = player;
					result.insertId = player.user_id;
					callback(result,params);
					database.end();
				});
			});
		});
		
	});
}

function lookupUser(callback,params){
	createConnection();
	database.connect(function(e){
		if(e){
			throw e;
		}
		database.query("SELECT * FROM queenanne.user WHERE user_name LIKE ?",params.username,function(e,result){
			if(e){
				throw e;
			}
			if(result.length == 0){
				utils.messageUser(params.id,'unsuccessfulAuth',{reason:"User not found"});
				return;
			}
			if(result[0].password !== params.password){
				utils.messageUser(params.id,'unsuccessfulAuth',{reason:"Password incorrect"});
				return;
			}

			authedUserList[params.id] = result[0].user_id;
			params.user_id = result[0].user_id;
			
			database.query("SELECT * FROM queenanne.player WHERE user_id LIKE ?",params.user_id,function(e,result){
				if(e){
					throw e;
				}
				callback(result,params);
				database.end();
			});
		});
	});
}

function lookupPlayer(callback,params){
	createConnection();
	database.connect(function(e){
		if(e){
			throw e;
		}
		database.query("SELECT * FROM queenanne.player WHERE user_id LIKE ?",params.user_id,function(e,result){
			if(e){
				throw e;
			}
			callback(result,params);
			database.end();
		});
	});
}

function authCallback(result,params){
	if(result == undefined){
		utils.messageUser(params.id,'unsuccessfulAuth',{reason:"Player not found"});
		return;
	}
	utils.messageUser(params.id,'successfulAuth',result[0]);
}

function regCallback(result,params){
	if(result.insertId == undefined){
		utils.messageUser(params.id,'unsuccessfulReg',{reason:"Failed to register"});
		return;
	}
	authedUserList[params.id] = result.insertId;
	utils.messageUser(params.id,'successfulReg',params.player);
}

function logToFile(fileLoc,content){
	fs.appendFile(__dirname + fileLoc, content);
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}