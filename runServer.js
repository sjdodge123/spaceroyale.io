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

//Gameobject lists
var clientList = {},
	bulletList = {},
	shipList = {};

var world = factory.getWorld();

//Gamerules
var minPlayersToStart = 2,
	damageRate = 2,
	damagePerTick = 15,
	shrinkTime = 60,
	shrinkerTimer = null,
	shrinkTimeLeft = 60,
	shrinkRate = .3;

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
		console.log(message.name + " connected");
		clientCount++;
		//Add this player to the list of current clients
		clientList[client.id] = message.name; 

		//Spawn a ship for the new player
		shipList[client.id] = spawnNewShip(message.color);

		//Send the current gamestate to the new player
		var gameState = {
			playerList:clientList,
			shipList:shipList,
			world:world
		};
		client.emit("gameState" , gameState);

		//Update all existing players with the new player's info
		var appendPlayerList = {
			name:message.name,
			id:client.id,
			ship:shipList[client.id]
		};
		client.broadcast.emit("playerJoin",appendPlayerList);
		checkForGameStart();
	});

	client.on('disconnect', function() {
		var name = clientList[client.id];
		var id = client.id;
		client.broadcast.emit('playerLeft',client.id);
		console.log(name + ' disconnected');
		delete clientList[id];
		delete shipList[id];

		clientCount = 0; 
		for(var user in clientList){
			clientCount++;
		}
		if(clientCount == 0){
			serverSleeping = true;
			console.log("Server sleeping..");
		}
		
  	});

	client.on('movement',function(packet){
		if(shipList[client.id] != null){
			shipList[client.id].moveForward = packet.moveForward;
			shipList[client.id].moveBackward = packet.moveBackward;
			shipList[client.id].turnLeft = packet.turnLeft;
			shipList[client.id].turnRight = packet.turnRight;
		}
	});

	client.on('mousemove',function(loc){
		var ship = shipList[client.id];
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

function checkForGameStart(){
	if(getShipCount() == minPlayersToStart){
		gameStart();
	}
}

function gameStart(){
	randomLocShips();
	gameActive = true;
	world.drawNextBound();
	shrinkerTimer = factory.getTimer(world.shrinkBound,shrinkTime*1000);
}

function randomLocShips(){
	for(var shipID in shipList){
		var ship = shipList[shipID];
		var loc = world.getRandomLoc();
		ship.x = loc.x;
		ship.y = loc.y;
	}
}


//Gamestate updates
function update(){
	if(gameActive){
		checkForWin();
		shrinkTimeLeft = shrinkerTimer.getTimeLeft().toFixed(1);
	}
	if(!serverSleeping){
		checkCollisions();
		updateShips();
		updateBullets();
		sendUpdates();
	}
}

function checkForWin(){
	if(getShipCount() == 1){
		gameOver();
	}
}

function getShipCount(){
	var shipCount = 0;
	for(var shipID in shipList){
		shipCount++;
	}
	return shipCount;
}

function gameOver(){
	gameActive = false;
	for(var shipID in shipList){
		console.log(clientList[shipID]+" wins!");
		io.sockets.emit("gameOver",shipID);
		//TODO: instead of immediately closing and booting all active players , a timer should start and wait to kick them out of the room
		io.sockets.emit("serverShutdown","Server has closed your session");
		resetGame();
	}
}

function resetGame(){
	world.reset();
	shrinkerTimer.reset();
}

function checkCollisions(){
	var objectArray = [];
	for(var ship in shipList){
		objectArray.push(shipList[ship]);
	}
	for(var sig in bulletList){
		objectArray.push(bulletList[sig]);
	}
	broadBase(objectArray);
}

function updateShips(){
	for(var shipID in shipList){
		//Check for hit first!!
		if(gameActive){
			checkForMapDamage(shipID);
			if(checkHP(shipID)){continue;}
		}
		
		moveShip(shipID);

	}
}

function checkHP(shipID){
	var ship = shipList[shipID];
	if(ship == null){
		return;
	}
	if(ship.health < 1){
		io.sockets.emit('shipDeath',shipID);
		delete shipList[shipID];
		return true;
	}
	return false;
}

function checkForMapDamage(shipID){
	var ship = shipList[shipID];
	if(world.inBounds(ship) == false || world.blueBound.inBounds(ship) == false){
		if(ship.damageTimer == false){
			ship.damageTimer = true;
			setTimeout(dealMapDamage,damageRate*1000,shipID);
		}
	}
}

function dealMapDamage(shipID){
	var ship = shipList[shipID];
	if(ship == undefined){
		return;
	}
	if(world.inBounds(ship) && world.blueBound.inBounds(ship)){
		ship.damageTimer = false;
	} else{
		ship.health -= damagePerTick;
		setTimeout(dealMapDamage,damageRate*1000,shipID);
	}
	
}

function updateBullets(){
	for(var sig in bulletList){
		//Check for hit first!!
		updatePhysics(bulletList[sig]);
		moveBullet(bulletList[sig]);
	}
}

function sendUpdates(){
	io.sockets.emit("movementUpdates",{shipList:shipList,bulletList:bulletList,world:world,shrinkTimeLeft:shrinkTimeLeft});
}

function moveShip(shipID){
	var ship = shipList[shipID];
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

function updatePhysics(object){
	object.velX = Math.cos((object.angle+90)*(Math.PI/180))*object.speed;
	object.velY = Math.sin((object.angle+90)*(Math.PI/180))*object.speed;
}

function moveBullet(bullet){
	bullet.x += bullet.velX;
	bullet.y += bullet.velY;
}

function spawnNewShip(color){
	var loc = world.getRandomLoc();
	return factory.getShip(loc.x,loc.y,10,10,color);
}

function spawnNewBullet(id){
	var ship = shipList[id];
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
	bulletList[bullet.sig] = bullet;
	return bullet;
}

function terminateBullet(sig){
	delete bulletList[sig];
}

//Utils
function generateBulletSig(){
	var sig = getRandomInt(0,99999);
	if(bulletList[sig] == null || bulletList[sig] == undefined){
		return sig;
	}
	sig = generateBulletSig();
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

//Collision
function broadBase(objectArray){
	//Shitty Collision detection for first run through
	checkBoxBroad(objectArray);
}

function checkBoxBroad(objectArray){
	for (var i = 0; i < objectArray.length; i++) {
    	for (var j = 0; j < objectArray.length; j++) {

    		if(objectArray[i] == objectArray[j]){
    			continue;
    		}
    		var obj1 = objectArray[i],
    			obj2 = objectArray[j];

    		if(checkDistance(obj1,obj2)){
    			obj1.isHit = true;
    			obj1.color = obj1.hitColor;

    			obj2.isHit = true;
    			obj2.color = obj2.hitColor;
    		} else{
    			obj1.isHit = false;
    			obj1.color = obj1.baseColor;

    			obj2.isHit = false;
    			obj2.color = obj2.baseColor;;
    		}
    	}
    }
}

function checkBoxNarrow(box1,box2) {
	if (box1.x < box2.x + box2.width &&
	    box1.x + box1.width > box2.x &&
	    box1.y < box2.y + box2.height &&
	    box1.height + box1.y > box2.y){
		return true;
	}
	return false;
}

function checkDistance(obj1,obj2){
	var distance = Math.sqrt(Math.pow((obj2.x - obj1.x),2) + Math.pow((obj2.y - obj1.y),2));
	if(distance < 10){
		return true;
	}
	return false;
}