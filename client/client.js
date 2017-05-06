var playerList = {};
function clientConnect(name) {
	var server = io();

	server.on('welcome', function(id){
		console.log("Connected to server");
		playerList[id] = name;
		server.emit("gotit",name);
	});

	server.on("gameState", function(gameState){
		playerList = gameState.playerList;
	});

	server.on("playerJoin", function(appendPlayerList){
		console.log(appendPlayerList.name + " has joined the battle");
		playerList[appendPlayerList.id] = appendPlayerList.name;
	});

	server.on("playerLeft", function(id){
		var name = playerList[id];
		console.log(name + " disconnected");
		delete playerList[id];
	});

   	return server;
}