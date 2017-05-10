var myID = null,
	world,
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

	server.on('serverShutdown', function(reason){
    	serverRunning = false;
    	serverShutdownReason = reason;
    	server.disconnect();
  	});

	server.on("movementUpdates",function(movementPacket){
		shipList = movementPacket.shipList;
		bulletList = movementPacket.bulletList;
		world = movementPacket.world;
		shrinkTimeLeft = movementPacket.shrinkTimeLeft;
	});

	server.on("shotsFired",function(bullet){
		bulletList[bullet.sig] = bullet;
	});

   	return server;
}