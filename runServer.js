var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var factory = require('./server/factory.js');
var c = require('./server/config.json');

//Base Server Settings
var serverSleeping = true,
	serverTickSpeed = c.serverTickSpeed,
	gameActive = false,
	clientCount = 0;

//Room settings

var roomList = {},
	maxPlayersInRoom = c.maxPlayersInRoom,
	roomKickTimeout = c.roomKickTimeout;

//Base Server Functions
server.listen(c.port,c.host, function(){
  console.log('listening on '+c.host+':'+c.port);
});

process.on( 'SIGINT', function() {
	  console.log( "\nServer shutting down from (Ctrl-C)" );
	  io.sockets.emit("serverShutdown","Server terminated");
	  process.exit();
});

io.on('connection', function(client){
	client.emit("welcome",client.id);
	client.on('gotit', function(message){

		//Find a room with space
		var roomSig = findARoom(client.id);
		var room = roomList[roomSig];
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
		var name = room.clientList[client.id];
		var id = client.id;
		client.broadcast.to(room.sig).emit('playerLeft',client.id);
		console.log(name + ' disconnected from Room' + room.sig);
		room.leave(client);
		delete room.clientList[id];
		delete room.shipList[id];

		if(getActiveRoomCount() == 0){
			serverSleeping = true;
			console.log("Server sleeping..");
		}
  	});

	client.on('movement',function(packet){
		var room = locateMyRoom(client.id);
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
		var ship = room.shipList[client.id];
		if(ship != null && ship != undefined){
			ship.angle = (180/Math.PI)*Math.atan2(loc.y-ship.y,loc.x-ship.x)-90;
		}
	});
	

	client.on('click',function(loc){
		//if bullet should be spawned (could be clicking something else)
		var bullet = spawnNewBullet(client.id);
	});

	if(serverSleeping){
		serverSleeping = false;
		setInterval(update,serverTickSpeed);
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
	delete roomList[sig];
}

//Gamestate updates
function update(){
	if(!serverSleeping){
		for(var sig in roomList){
			var room =  roomList[sig];
			var status = room.update();

			//Send messages about ships death
			for(var shipID in room.shipList){
				var ship = room.shipList[shipID];
				if(ship.alive == false){
					io.to(sig).emit('shipDeath',shipID);
					delete room.shipList[shipID];
				}
			}
			
			//if game is over send messages
			if(room.game.gameEnded){
				io.to(sig).emit("gameOver",room.game.winner);
				setTimeout(reclaimRoom,roomKickTimeout*1000,sig);	
			}
			io.to(sig).emit("movementUpdates",{
				shipList:room.shipList,
				bulletList:room.bulletList,
				asteroidList:room.asteroidList,
				planetList:room.planetList,
				world:room.world,
				state:room.game.active,
				lobbyTimeLeft:room.game.lobbyTimeLeft,
				shrinkTimeLeft:room.game.shrinkTimeLeft});
		}
	}
}
function spawnNewBullet(id){
	var room = locateMyRoom(id);
	var ship = room.shipList[id];
	room.game.gameBoard.spawnNewBullet(ship);
}
function generateRoomSig(){
	var sig = getRandomInt(0,99999);
	if(roomList[sig] == null || roomList[sig] == undefined){
		return sig;
	}
	sig = generateRoomSig();
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}