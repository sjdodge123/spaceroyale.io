var myID = null,
	playerList = {},
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
		console.log(playerList);
		delete playerList[id];
		delete shipList[id];
	});

	server.on("movementUpdates",function(movementPacket){
		shipList = movementPacket;
	});

	server.on('serverShutdown', function(reason){
    	serverRunning = false;
    	serverShutdownReason = reason;
    	server.disconnect();
  	});

   	return server;
}