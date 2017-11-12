var utils = require('./utils.js');
var c = utils.loadConfig();
var hostess = require('./hostess.js');
var bouncer = require('./bouncer.js');
var database = require('./database.js');
var compressor = require('./compressor.js');

var mailBoxList = {},
	roomMailList = {},
	io;

exports.build = function(mainIO){
	io = mainIO;
}
exports.addMailBox = function(id,client){
	mailBoxList[id] = client;
	checkForMail(mailBoxList[id]);
}
exports.addRoomToMailBox = function(id,roomSig){
	roomMailList[id] = roomSig;
}
exports.removeRoomMailBox = function(id){
	delete roomMailList[id];
}

exports.removeMailBox = function(id){
	delete mailBoxList[id];
}

exports.getTotalPlayers = function(){
	var count = 0;
	for(var box in mailBoxList){
		count++;
	}
	return count;
}
exports.getClient = function(id){
	return mailBoxList[id];
}
exports.toastPlayer = function(id,message){
	toastPlayer(id,message);
}
exports.messageUser = function(id,header,payload){
	messageUser(id,header,payload);
}
exports.messageRoomBySig = function(sig,header,payload){
	messageRoomBySig(sig,header,payload);
}
exports.messageRoomByUserID = function(id,header,payload){
	messageRoomByUserID(id,header,payload);
}

function checkForMail(client){
	client.emit("welcome",client.id);

	client.on('register',function(creds){
		creds.address = client.handshake.address;
		creds.id = client.id;
		bouncer.checkReg(creds);
	});

	client.on('auth',function(creds){
		creds.address = client.handshake.address;
		creds.id = client.id;
		bouncer.checkAuth(creds);
	});

	client.on('enterLobby', function(message){
		//Find a room with space
		var roomSig = hostess.findARoom(client.id);
		var room = hostess.joinARoom(roomSig,client.id);
		var name = bouncer.trimName(message.name);
		console.log(name + " joined Room "+roomSig);

		//Add this player to the list of current clients in the room
		room.clientList[client.id] = name;

		//Spawn a ship for the new player
		room.shipList[client.id] = room.world.spawnNewShip(client.id,message.color);

		//Send the current gamestate to the new player
		var worldData = compressor.worldResize(room.world);
		var shipData = compressor.shipSpawns(room.shipList);
		var gameState = {
			playerList:room.clientList,
			shipList:shipData,
			config:c,
			world:worldData,
			maxLobbyTime:c.lobbyWaitTime
		};
		client.emit("gameState" , gameState);

		//Update all existing players with the new player's info
		var appendShipData = compressor.appendShip(room.shipList[client.id]);
		var appendPlayerList = {
			name:name,
			id:client.id,
			ship:appendShipData
		};
		client.broadcast.to(roomSig).emit("playerJoin",appendPlayerList);
		toastPlayer(client.id,"Joined Room " +  roomSig);
	});

	client.on('singlePlayerStart',function(){
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		room.game.playNowPressed = true;
	});

	client.on('playerLeaveRoom',function(){
		hostess.kickFromRoom(client.id);
	});

  	client.on('signout',function(){
  		database.removeAuthedUser(client.id);
  		client.emit('successfulSignout');
  	});



	client.on('movement',function(packet){
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship != null){
			if(ship.enabled){
				ship.moveForward = packet.moveForward;
				ship.moveBackward = packet.moveBackward;
				ship.turnLeft = packet.turnLeft;
				ship.turnRight = packet.turnRight;
			}
		}
	});

	client.on('mousemove',function(loc){
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship != null && ship != undefined){
			if(ship.enabled){
				ship.weapon.angle = (180/Math.PI)*Math.atan2(loc.y-ship.y,loc.x-ship.x)-90;
			}
		}
	});

	client.on('touchaim',function(loc){
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship != null && ship != undefined){
			ship.weapon.angle = (180/Math.PI)*Math.atan2(loc.y2-loc.y1,loc.x2-loc.x1)-90;
		}
	});

	client.on('fireGun',function(loc){
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship == null){
			return;
		}
		ship.fireWeapon = true;
	});

	client.on('stopGun',function(){
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship == null){
			return;
		}
		ship.stopWeapon = true;
	});


	client.on('activateGadget',function(loc){
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship == null){
			return;
		}
		ship.useGadget = true;
	});

	client.on('stopGadget',function(){
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship == null){
			return;
		}
		ship.stopGadget = true;
	});

	client.on('passiveChanged',function(packet){
		if(packet == null){
			return;
		}
		if(packet.newPassive == null){
			return;
		}
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		if(ship == null){
			return;
		}
		ship.equipPassive(packet.newPassive,packet.oldPassive);
	});

	client.on('drip',function(){
  		client.emit('drop');
  	});

  	client.on('changeWeapon',function(weaponName){
  		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		if(room.game.active){
			return;
		}
		var ship = room.shipList[client.id];
		ship.changeWeapon(weaponName);
  	});

	client.on("changeGadget",function(gadgetName){
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		if(room.game.active){
			return;
		}
		var ship = room.shipList[client.id];
		ship.changeGadget(gadgetName);
	});

}

function messageUser(id,header,payload){
	if(mailBoxList[id] != null){
		mailBoxList[id].emit(header,payload);
	}
}
function toastPlayer(id,message){
	if(mailBoxList[id] != null){
		mailBoxList[id].emit("toast",message);
	}
}
function messageRoomBySig(sig,header,payload){
	io.to(sig).emit(header,payload);
}
function messageRoomByUserID(id,header,payload){
	if(roomMailList[id] != null){
		io.to(roomMailList[id]).emit(header,payload);
	}
}
function getRoomFromId(clientID){
	return hostess.getRoomBySig(roomMailList[clientID]);
}
