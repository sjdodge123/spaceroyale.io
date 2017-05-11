var myID = null,
	
	timeSinceLastCom = 0,
	serverTimeoutWait = 5,
	world,
	asteroidList = {},
	playerList = {},
	bulletList = {},
	shipList = {};
function clientConnect(name) {
	var server = io();

	server.on('welcome', function(id){
		console.log("Connected to server");
		myID = id;
		playerList[id] = name;
		server.emit("gotit",name);
	});

	server.on("gameState", function(gameState){
		playerList = gameState.playerList;
		shipList = gameState.shipList;
		world = gameState.world;
		if(shipList[myID] != null){
			myShip = shipList[myID];
		}
	});

	server.on("playerJoin", function(appendPlayerList){
		console.log(appendPlayerList.name + " has joined the battle");
		playerList[appendPlayerList.id] = appendPlayerList.name;
		shipList[appendPlayerList.id] = appendPlayerList.ship;
	});

	server.on("playerLeft", function(id){
		var name = playerList[id];
		console.log(name + " disconnected");
		delete playerList[id];
		delete shipList[id];
	});

	server.on("shipDeath",function(id){
		if(id == myID){
			iAmAlive = false;
			delete shipList[id];
		}
	});

	server.on("gameOver",function(id){
		if(id == myID){
			victory = true;
		}
	});

	server.on('serverShutdown', function(reason){
    	serverRunning = false;
    	serverShutdownReason = reason;
    	server.disconnect();
  	});

	server.on("movementUpdates",function(movementPacket){
		shipList = movementPacket.shipList;
		bulletList = movementPacket.bulletList;
		asteroidList = movementPacket.asteroidList;
		world = movementPacket.world;
		gameStarted = movementPacket.state;
		lobbyTimeLeft = movementPacket.lobbyTimeLeft;
		shrinkTimeLeft = movementPacket.shrinkTimeLeft;
		timeSinceLastCom = 0;
	});

	server.on("shotsFired",function(bullet){
		bulletList[bullet.sig] = bullet;
	});

   	return server;
}

function checkForTimeout(){
	timeSinceLastCom++;
	if(timeSinceLastCom > serverTimeoutWait){
		serverRunning = false;
    	serverShutdownReason = "Server timed out";
		server.disconnect();
	}
}