var express = require('express')
  , http = require('http');
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, './client')));
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var serverSleeping = true,
	serverTickSpeed = 1000/60;
var clientList = {},
	shipList = {};

server.listen(3000, function(){
  console.log('listening on *:3000');
});

process.on( 'SIGINT', function() {
	  console.log( "\nServer shutting down from (Ctrl-C)" );
	  io.sockets.emit("serverShutdown","Server terminated");
	  process.exit();
});


function update(){
	updateShips();
	sendUpdates();
}

io.on('connection', function(client){
	client.emit("welcome",client.id);

	client.on('gotit', function(name){

		console.log(name + " connected");

		//Add this player to the list of current clients
		clientList[client.id] = name; 

		//Spawn a ship for the new player
		shipList[client.id] = spawnNewShip();

		//Send the current gamestate to the new player

		var gameState = {
			playerList:clientList,
			shipList:shipList
		};
		client.emit("gameState" , gameState);

		//Update all existing players with the new player's info
		var appendPlayerList = {
			name:name,
			id:client.id,
			ship:shipList[client.id]
		};
		client.broadcast.emit("playerJoin",appendPlayerList);
	});

	client.on('disconnect', function() {
		var name = clientList[client.id];
		var id = client.id;
		client.broadcast.emit('playerLeft',client.id);
		console.log(name + ' disconnected');
		delete clientList[id];
		delete shipList[id];
  	});

	
	client.on('movement',function(packet){
		if(shipList[client.id] != null){
			shipList[client.id].moveForward = packet.moveForward;
			shipList[client.id].moveBackward = packet.moveBackward;
			shipList[client.id].turnLeft = packet.turnLeft;
			shipList[client.id].turnRight = packet.turnRight;
		}
	});

	if(serverSleeping){
		setInterval(update,serverTickSpeed);
		serverSleeping = false;
	}
});

function updateShips(){
	for(var ship in shipList){
		moveShip(shipList[ship]);
	}
}

function sendUpdates(){
	io.sockets.emit("movementUpdates",shipList);
}

function moveShip(ship){
	if(ship.moveForward){
		ship.y -= 1;
	}
	if(ship.moveBackward){
		ship.y += 1;
	}
	if(ship.turnLeft){
		ship.x -= 1;
	}
	if(ship.turnRight){
		ship.x += 1;
	}
}

function spawnNewShip(){
	var loc = findRandomSpawnLoc();
	var ship = {
		x: loc.x,
		y: loc.y,
		width:10,
		height:10,
		moveForward: false,
		moveBackward: false,
		turnLeft: false,
		turnRight: false
	}
	return ship;
}

function findRandomSpawnLoc(){
	return {x:getRandomInt(10,790),y:getRandomInt(10,590)};
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}