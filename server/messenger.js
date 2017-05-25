var c = require('./config.json');
var utils = require('./utils.js');
var hostess = require('./hostess.js');
var database = require('./database.js');

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
	mailBoxList[id].emit("toast",message);
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

	client.on('enterLobby', function(message){
		//Find a room with space
		var roomSig = hostess.findARoom(client.id);
		var room = hostess.joinARoom(roomSig,client.id);
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
			ship.moveForward = packet.moveForward;
			ship.moveBackward = packet.moveBackward;
			ship.turnLeft = packet.turnLeft;
			ship.turnRight = packet.turnRight;
		}
	});

	client.on('mousemove',function(loc){
		var room = getRoomFromId(client.id);
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
		var room = getRoomFromId(client.id);
		if(room == undefined){
			return;
		}
		var ship = room.shipList[client.id];
		room.game.gameBoard.fireWeapon(ship);
	});
}

function messageUser(id,header,payload){
	mailBoxList[id].emit(header,payload);
}
function messageRoomBySig(sig,header,payload){
	io.to(sig).emit(header,payload);
}
function messageRoomByUserID(id,header,payload){
	io.to(roomMailList[id]).emit(header,payload);
}
function getRoomFromId(clientID){
	return hostess.getRoomBySig(roomMailList[clientID]);
}