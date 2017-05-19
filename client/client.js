var myID = null,
	
	timeSinceLastCom = 0,
	serverTimeoutWait = 5,
	world,
	asteroidList = {},
	itemList = {},
	planetList = {},
	playerList = {},
	bulletList = {},
	shipList = {};
function clientConnect(user,pass) {
	var server = io();

	server.on('welcome', function(id){
		myID = id;
		if(user!=null || pass != null){
			server.emit("auth",{username:user,password:pass});
		}
	});

	//playerList[id] = name;

	server.on("successfulAuth", function(playerInfo){
		changeToSignout();
		$('.collapse').collapse("hide");
		$('#signInUser').val('');
		$('#signInPass').val('');
		$('#nameBox').val(playerInfo.playerName).prop('disabled',true);
	});

	server.on("unsuccessfulAuth", function(){
		failedToAuth();
	});

	server.on("successfulSignout",function(){
		changeToSignIn();
    	$('#nameBox').val('').prop('disabled',false);
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
			server.disconnect();
			timeSinceLastCom = 0;
			serverTimeoutWait = 10;
		}
	});

	server.on("gameOver",function(id){
		if(id == myID){
			victory = true;
		}
		timeSinceLastCom = 0;
		serverTimeoutWait = 10;
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
		planetList = movementPacket.planetList;
		itemList = movementPacket.itemList;
		world = movementPacket.world;
		gameStarted = movementPacket.state;
		lobbyTimeLeft = movementPacket.lobbyTimeLeft;
		shrinkTimeLeft = movementPacket.shrinkTimeLeft;
		totalPlayers = movementPacket.totalPlayers;
		timeSinceLastCom = 0;
	});

	server.on("shotsFired",function(bullet){
		bulletList[bullet.sig] = bullet;
	});

	server.on("toast",function(message){
		toastMessage = message;
		eventLog.addEvent(message);
		toastTimer = setTimeout(clearToast,1700);
	});

	server.on("eventMessage",function(message){
		eventLog.addEvent(message);
	});

   	return server;
}

function checkForTimeout(){
	timeSinceLastCom++;
	if(timeSinceLastCom > serverTimeoutWait){
		serverRunning = false;
    	serverShutdownReason = "Server timed out";
		server.disconnect();
		window.parent.location.reload();
	}
}

function clearToast(){
	clearTimeout(toastTimer);
	toastMessage = null;
}

function clientSendStart(myname,mycolor){
	server.emit('enterLobby',{name:myname,color:mycolor});
}