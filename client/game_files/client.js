var myID = null,
	timeSinceLastCom = 0,
	serverTimeoutWait = 5,
	ping = 0,
	pingTimeout = null,
	lastTime = null,
	maxLobbyTime = null,
	world,
	quadTree,
	config;

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

	server.on("showReady",function(){
		$('#readyButton').show();
	});
	server.on("hideReady",function(){
		$('#readyButton').hide();
	});

	server.on("gameState", function(gameState){
		config = gameState.config;
		playerList = gameState.playerList;
		connectSpawnShips(gameState.shipList);
		worldResize(gameState.world);
		interval = config.serverTickSpeed;
		maxLobbyTime = gameState.maxLobbyTime;
		for(var id in playerList){
			eventLog.addEvent(playerList[id] + " has joined the battle");
		}
		if(gameState.myID != null){
			myID = gameState.myID;
		}
		if(shipList[myID] != null){
			myShip = shipList[myID];
		}
		if(config){
			applyConfigs();
		}
		cameraBouncing = config.AISpectateMode;
		clientSendMessage('changeWeapon',weaponArray[1].value);
		clientSendMessage('changeGadget',gadgetArray[1].value);
		clientSendMessage('passiveChanged',{newPassive:$('#firstPassive').attr('data-selected'),oldPassive:null});
	    clientSendMessage('passiveChanged',{newPassive:$('#secondPassive').attr('data-selected'),oldPassive:null});
	});

	server.on("playerJoin", function(appendPlayerList){
		eventLog.addEvent(appendPlayerList.name + " has joined the battle");
		playSound(playerJoinSound);
		playerList[appendPlayerList.id] = appendPlayerList.name;
		appendNewShip(appendPlayerList.ship);
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

	server.on("worldResize",function(payload){
		if(payload == null){
			return;
		}
		worldResize(payload);
	});

	server.on("whiteBoundShrinking",function(payload){
		if(payload == null){
			return;
		}
		whiteBoundShrinking(payload);
	});

	server.on("blueBoundShrinking",function(payload){
		if(payload == null){
			return;
		}
		blueBoundShrinking(payload);
	});

	server.on("spawnAIShips",function(payload){
		if(payload == null){
			return;
		}
		spawnAIShips(payload);
	});

	server.on("attributeApplied",function(payload){
		if(payload == null){
			return;
		}
		if(shipList[payload.id] == null){
			return;
		}
		if(payload.type == "health"){
			if(myShip.id == payload.id){
				toastMsg("Health Enhanced");
			}
			shipList[payload.id].healthAttribute += 1;
			return;
		}
		if(payload.type == "weapon"){
			if(myShip.id == payload.id){
				toastMsg("Weapon Enhanced");
			}
			shipList[payload.id].weaponAttribute += 1;
			return;
		}
		if(payload.type == "speed"){
			if(myShip.id == payload.id){
				toastMsg("Speed Enhanced");
			}
			shipList[payload.id].speedAttribute += 1;
			return;
		}
	});

	server.on("runningRiot",function(packet){
		if(packet == null){
			return;
		}
		if(shipList[packet.id] == null){
			return;
		}
		var name = shipList[packet.id].name || shipList[packet.id].AIName;
		if(myID == packet.id){
			playSound(runningRiot);
		}
		eventLog.addEvent(name +" is on a Running Riot!");
	});

	server.on("Bloodseeker",function(packet){
		if(packet == null){
			return;
		}
		var id = packet.id;
		if(shipList[id] == null){
			return;
		}
		var on = packet.on;
		if(on == true){
			shipList[id].bloodSeeker = true;
		} else{
			shipList[id].bloodSeeker = false;
		}
	});

	server.on("weaponFired",function(payload){
		if(payload == null){
			return;
		}
		weaponFired(payload);
	});

	server.on("weaponCharge",function(level){
		if(myShip == null){
			return;
		}
		myShip.weapon.chargeLevel = level;
	});

	server.on("changeGadget",function(packet){
		if(packet == null){
			return;
		}
		if(shipList[packet.id] != null){
			shipList[packet.id].gadget = packet.name;
		}
		if(packet.id != myShip.id){
			return;
		}
		changeGadgetHUD(packet.name);
	});

	server.on("gadgetActivated",function(packet){
		if(packet == null){
			return;
		}
		gadgetActivated(packet);
	});

	server.on('gadgetCooldownStart',function(packet){
		if(packet == null){
			return;
		}
		if(shipList[packet.id] != null){
			shipList[packet.id].gadgetCooldown = 0;
		}
		if(packet.id != myShip.id){
			return;
		}
		__showProgress(100,'gadget-cooldown');
	});

	server.on('gadgetCooldownUpdate',function(packet){
		if(packet == null){
			return;
		}
		for(var i=0;i<packet.length;i++){
			var object = packet[i];
			if(shipList[object.id] != null){
				shipList[object.id].gadgetCooldown = object.percent;
			}
			if(object.id != myShip.id){
				continue;
			}
			__showProgress(object.percent,'gadget-cooldown');
		}
	});

	server.on('gadgetCooldownStop',function(packet){
		if(packet == null){
			return;
		}
		if(shipList[packet.id] != null){
			shipList[packet.id].gadgetCooldown = 100;
		}
		if(packet.id != myShip.id){
			return;
		}
		__showProgress(0,'gadget-cooldown');
	});

	server.on("terminateGadgets",function(deadSigs){
		for(var i=0;i<deadSigs.length;i++){
			terminateGadget(deadSigs[i]);
		}
	});

	server.on('terminateBullet',function(deadSigs){
		for(var i=0;i<deadSigs.length;i++){
			var explodedShell = bulletList[deadSigs[i]];
			if (explodedShell.weaponName != 'ParticleBeam' && camera.inBounds(explodedShell)){
				createExplosion(explodedShell.x,explodedShell.y, explodedShell.height, 1);
			}
			terminateBullet(deadSigs[i]);
		}
	});

	server.on("shotLanded",function(payload){
		playSound(shotPlayer);
		var ship = shipList[payload.id] || tradeShipList[payload.id];
		if(ship == null){
			return;
		}
		if(camera.inBounds(ship)){

			if(payload.crit == true){
				addCombatTextCrit("-" + parseFloat(payload.damage).toFixed(1),ship.x-50,ship.y-50);
			}
			addCombatText("-" +parseFloat(payload.damage).toFixed(1),ship.x-50,ship.y-50);
		}
	});

	server.on("spawnItems",function(packet){
		if(packet != null){
			spawnItems(packet);
		}
	})

	server.on("spawnTradeShip",function(packet){
		if(packet != null){
			spawnTradeShip(packet);
		}
	});
	server.on("terminateTradeShips",function(deadSigs){
		for(var i=0;i<deadSigs.length;i++){
			terminateTradeShip(deadSigs[i]);
		}
	});

	server.on("terminateItems",function(deadSigs){
		for(var i=0;i<deadSigs.length;i++){
			terminateItem(deadSigs[i]);
		}
	});

	server.on("equipItem",function(packet){
		if(packet != null){
			equipItem(packet);
		}
	});

	server.on("updateItem",function(packet){
		if(packet != null){
			updateItem(packet);
		}
	});
	server.on("updateShield",function(packet){
		if(packet != null){
			updateShield(packet);
		}
	})

	server.on("spawnNebula",function(packet){
		if(packet != null){
			spawnNebula(packet);
		}
	});

	server.on("spawnPlanets",function(packet){
		if(packet != null){
			spawnPlanets(packet);
		}
	});

	server.on("spawnAsteroids",function(packet){
		if(packet != null){
			spawnAsteroids(packet);
		}
	});

	server.on("terminateAsteroids",function(deadSigs){
		for(var i=0;i<deadSigs.length;i++){
			terminateAsteroid(deadSigs[i]);
		}
	});

	server.on("asteroidHurt",function(packet){
		if(packet != null){
			asteroidList[packet.sig].health = packet.health;
		}
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

	server.on("shipHiding",function(id){
		if(id != null){
			shipList[id].isHiding = true;
		}
	});

	server.on("shipNotHiding",function(id){
		if(id != null){
			shipList[id].isHiding = false;
		}
	});

	server.on("shipDeath",function(packet){
		var id = packet[0];
		var killerId = packet[1];
		var killerName = '';
		var explodedShip = shipList[id];
		if(camera.inBounds(explodedShip)){
			playSound(shipDeath);
			createExplosion(explodedShip.x,explodedShip.y, 3*explodedShip.radius, 0);
		}

		if(killerId != null && shipList[killerId] != null){
			shipList[killerId].kills += 1;
			killerName = playerList[killerId] || shipList[killerId].AIName;

		}
		delete shipList[id];
		if(id == myID && iAmAlive){
			iAmAlive = false;
			playSound(youDied);
			createExplosion(explodedShip.x,explodedShip.y, 3*explodedShip.radius, 0);
			cameraBouncing = true;
			if(id != null && killerId != null && killerName != ''){
				showGameOverScreen("You were killed by " + killerName);
				return;
			}
			showGameOverScreen("You died!");
			return;
		}


	});
	server.on('shipHealth',function(packet){
		if(packet == null){
			return;
		}
		if(packet.id == null){
			return;
		}
		if(packet.health == null){
			return;
		}
		if(shipList[packet.id] == null){
			return;
		}
		shipList[packet.id].health = packet.health;
	});

	server.on('shipPower',function(packet){
		if(packet == null){
			return;
		}
		if(packet.id == null){
			return;
		}
		if(packet.power == null){
			return;
		}
		if(shipList[packet.id] == null){
			return;
		}
		shipList[packet.id].power = packet.power;
	});

	server.on('shipsRegenerating',function(packet){
		if(packet == null){
			return;
		}
		for (var i = 0; i < packet.length; i++){
			var element  = packet[i];
			var id = element[0];
			var health = element[1];
			var power = element[2];
			if(id == null){
				continue;
			}
			if(health == null){
				continue;
			}
			if(shipList[id] == null){
				continue;
			}
			shipList[id].health = health;
			shipList[id].power = power;
		}
	});

	server.on("gameOver",function(id){
		delete shipList[id];
		if(id == myID && iAmAlive){
			iAmAlive = false;
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
		updateShipList(updatePacket.shipList);
		updateTradeShipList(updatePacket.tradeShipList);
		updateBulletList(updatePacket.bulletList);
		updateGadgetList(updatePacket.gadgetList);
		updateItemList(updatePacket.itemList);
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
		toastMsg(message);
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

function toastMsg(message){
	trailingToasts.unshift({text:message,received:Date.now()});
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

function fireGun(_x,_y){
    if(iAmAlive){
    	server.emit("fireGun",{x:_x,y:_y});
    }
}

function stopFiring(){
	if(iAmAlive && iAmFiring){
		iAmFiring = false;
		server.emit("stopGun");
	}
}

function activateGadget(_x,_y){
	if(iAmAlive){
       	server.emit("activateGadget",{x:_x,y:_y});
    }
}
function stopGadget(){
	if(iAmAlive && useGadget){
		useGadget = false;
		server.emit("stopGadget");
	}
}
function clientSendReady(){
	server.emit('singlePlayerStart');
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

function clientSendMessage(header,payload){
	server.emit(header,payload);
}
