var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var factory = require('./server/factory.js');
//var util = require('./server/util.js');
//Base Server Settings
var serverSleeping = true,
	serverTickSpeed = 1000/60,
	gameActive = false,
	clientCount = 0;

//Room settings

var roomList = {},
	maxRoomSize = 3,
	roomTimeout = 30;

//Base Server Functions
server.listen(3000, function(){
  console.log('listening on *:3000');
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
		roomList[sig] = factory.getRoom(sig,maxRoomSize);
		return sig;
	}
	for(var sig2 in roomList){
		if(roomList[sig2].hasSpace()){
			return sig2;
		}
	}
	var sig3 = generateRoomSig();
	roomList[sig3] = factory.getRoom(sig3,maxRoomSize);
	return sig3;
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
				//TODO: instead of immediately closing and booting all active players , a timer should start and wait to kick them out of the room
				io.to(sig).emit("serverShutdown","Server has closed your session");
				room.game.reset();
			}
			io.to(sig).emit("movementUpdates",{shipList:room.shipList,bulletList:room.bulletList,world:room.world,shrinkTimeLeft:room.game.shrinkTimeLeft});
		}
	}
}
function spawnNewBullet(id){
	var room = locateMyRoom(id);
	var ship = room.shipList[id];
	room.game.gameBoard.spawnNewBullet(ship);
	/*
	var bullet = {
		x:ship.x,
		y:ship.y,
		speed:5,
		velX:0,
		velY:0,
		damage:30,
		angle:ship.angle,
		isHit: false,
		width:2,
		height:6,
		color:ship.baseColor,
		owner:id,
		lifetime:5,
		sig:generateBulletSig()
	}

	setTimeout(terminateBullet,bullet.lifetime*1000,bullet.sig);
	room.bulletList[bullet.sig] = bullet;
	return bullet;
	*/
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