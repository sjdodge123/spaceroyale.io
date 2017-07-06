var myID = null,
	timeSinceLastCom = 0,
	serverTimeoutWait = 5,
	ping = 0,
	pingTimeout = null,
	lastTime = null,
	maxLobbyTime = null,
	world,
	quadTree,
	asteroidList = {},
	itemList = {},
	planetList = {},
	playerList = {},
	bulletList = {},
	nebulaList = {},
	tradeShipList = {},
	shipList = {};
function clientConnect() {
	var server = io();


	server.on('welcome', function(id){
		myID = id;
	});

	server.on("successfulAuth", function(player){
		profile = player;
		displayPlayerProfile(player);
		changeToSignout();
		$('#signInModal').modal('toggle');
		$('#signInUser').val('');
		$('#signInPass').val('');
	});

	server.on("successfulReg",function(player){
		profile = player;
		displayPlayerProfile(player);
		changeToSignout();
		$('#signUpModal').modal('toggle');
	});

	server.on("unsuccessfulAuth", function(payload){
		console.log(payload.reason);
		failedToAuth();
	});

	server.on("unsuccessfulReg",function(payload){
		failedToRegister(payload.reason);
	});

	server.on("successfulSignout",function(){
		changeToSignIn();
    	$('#nameBox').val('').prop('disabled',false);
	});

	server.on("drop",function(){
		calcPing();
	});

	server.on("gameState", function(gameState){
		playerList = gameState.playerList;
		shipList = gameState.shipList;
		world = gameState.world;
		maxLobbyTime = gameState.maxLobbyTime;
		for(var id in playerList){
			eventLog.addEvent(playerList[id] + " has joined the battle");
		}

		if(shipList[myID] != null){
			myShip = shipList[myID];
		}

	});

	server.on("playerJoin", function(appendPlayerList){
		eventLog.addEvent(appendPlayerList.name + " has joined the battle");
		playSound(playerJoinSound);
		playerList[appendPlayerList.id] = appendPlayerList.name;
		shipList[appendPlayerList.id] = appendPlayerList.ship;
	});

	server.on("playerLeft", function(id){
		var name = playerList[id];
		if(name != null){
			console.log(name + " disconnected");
			delete playerList[id];
			delete shipList[id];
			return;
		}
		console.log("I disconnected");
	});

	server.on("weaponFired",function(payload){
		if(payload.ship.id == myID){
			lastFired = new Date();
		}
		if(camera.inBounds(payload.ship)){
			if(payload.weapon.name == "Blaster"){
            	playSound(blasterShot);
        	}
        	if(payload.weapon.name == "PhotonCannon"){
            	playSound(photonCannonShot);
        	}
		}
	});

	server.on("shotLanded",function(){
		playSound(shotPlayer);
	});

	server.on("shotAsteroid",function(asteroid){
		if(camera.inBounds(asteroid)){
			playSound(shotAsteroid);
		}
	});

	server.on("collideWithObject",function(){
		playSoundAfterFinish(collision);
	});

	server.on("gameStart",function(){
		gameStart();
	});

	server.on("shipDeath",function(id){
		if(id == myID){
			iAmAlive = false;
			playSound(youDied);
			delete shipList[id];
			cameraBouncing = true;
			showGameOverScreen("You died!");
			return;
		}
		if(camera.inBounds(shipList[id])){
			playSound(shipDeath);
		}
	});

	server.on("gameOver",function(id){
		if(id == myID && iAmAlive){
			iAmAlive = false;
			delete shipList[id];
			gameOver();
			showGameOverScreen("Winner winner chicken dinner!");
		}
		timeSinceLastCom = 0;
		serverTimeoutWait = 60;
	});

	server.on('serverShutdown', function(reason){
    	serverRunning = false;
    	serverShutdownReason = reason;
    	server.disconnect();
  	});

	server.on("gameUpdates",function(updatePacket){
		shipList = updatePacket.shipList;
		bulletList = updatePacket.bulletList;
		asteroidList = updatePacket.asteroidList;
		planetList = updatePacket.planetList;
		itemList = updatePacket.itemList;
		nebulaList = updatePacket.nebulaList;
		tradeShipList = updatePacket.tradeShipList;
		world = updatePacket.world;
		quadTree = updatePacket.quadTree;
		gameStarted = updatePacket.state;
		lobbyTimeLeft = updatePacket.lobbyTimeLeft;
		shrinkTimeLeft = updatePacket.shrinkTimeLeft;
		totalPlayers = updatePacket.totalPlayers;
		timeSinceLastCom = 0;

		if(myShip != null && myShip.weapon != null){
			currentWeaponCooldown = myShip.weapon.cooldown*1000;
		}
	});

	server.on("shotsFired",function(bullet){
		bulletList[bullet.sig] = bullet;
	});

	server.on("toast",function(message){
		toastMessage = message;
		toastTimer = setTimeout(clearToast,1700);
	});

	server.on("eventMessage",function(message){
		eventLog.addEvent(message);
	});

	server.on("profileUpdate",function(player){
		profile = player;
		updateProfile(player);
	});
   	return server;
}

function pingServer(){
	clearTimeout(pingTimeout);
	lastTime = new Date();
	server.emit('drip');
}

function calcPing(){
	ping = new Date() - lastTime;
	pingTimeout = setTimeout(pingServer,1000);
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

function clientSendAuth(user,pass){
	server.emit("auth",{username:user,password:pass});
}

function clientSendReg(user,pass,gameName){
	server.emit("register",{username:user,password:pass,gamename:gameName});
}

function clientSendStart(myname,mycolor){
	server.emit('enterLobby',{name:myname,color:mycolor});
}
