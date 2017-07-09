var myID = null,
	timeSinceLastCom = 0,
	serverTimeoutWait = 5,
	ping = 0,
	pingTimeout = null,
	lastTime = null,
	maxLobbyTime = null,
	world,
	quadTree,
	config,
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
		config = gameState.config;
		interval = config.serverTickSpeed;
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
		if(payload == null){
			return;
		}
		weaponFired(payload);
	});
	server.on('terminateBullet',function(deadSigs){
		for(var i=0;i<deadSigs.length;i++){
			terminateBullet(deadSigs[i]);
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

function weaponFired(payload){
	var id,ship,weaponName,weaponLevel,numBullets,i,bullet;

	payload = JSON.parse(payload);
	id = payload[0];
	ship = shipList[id];
	weaponName = payload[1];
	weaponLevel = payload[2];
	numBullets = payload[3];

	for(i=4;i<numBullets+4;i++){
		bullet = payload[i];
		if(bulletList[bullet[0]] == null){
			bulletList[bullet[0]] = {};
			bulletList[bullet[0]].velX = 0;
			bulletList[bullet[0]].velY = 0;
			bulletList[bullet[0]].owner = id;
			bulletList[bullet[0]].x = bullet[1];
			bulletList[bullet[0]].y = bullet[2];
			bulletList[bullet[0]].angle = bullet[3];
			bulletList[bullet[0]].speed = bullet[4];
			bulletList[bullet[0]].width = bullet[5];
			bulletList[bullet[0]].height = bullet[6];

			setTimeout(terminateBullet,config.bulletLifetime*1000 + 200,bullet[0]);
		}
	}
	if(id == myID){
		lastFired = new Date();
	}
	if(camera.inBounds(ship)){
		if(weaponName == "Blaster"){
        	playSound(blasterShot);
    	}
    	if(weaponName == "PhotonCannon"){
        	playSound(photonCannonShot);
    	}
    	if(weaponName == "MassDriver"){
    		if(weaponLevel == 3){
    			playSound(massDriverShot2);
    		} else{
    			playSound(massDriverShot1);
    		}
    	}
	}
}