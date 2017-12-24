'use strict';
var utils = require('./utils.js');
var c = utils.loadConfig();
var messenger = require('./messenger.js');
var database = require('./database.js');
var _engine = require('./engine.js');
var AI = require('./AI.js');
var compressor = require('./compressor.js');

exports.getRoom = function(sig,size){
	return new Room(sig,size);
}

class Room {
	constructor(sig,size){
		this.sig = sig;
		this.size = size;
		this.clientList = {};
		this.planetList = {};
		this.nebulaList = {};
		this.tradeShipList = {};
		this.asteroidList = {};
		this.bulletList = {};
		this.itemList = {};
		this.shipList = {};
		this.AIList = {};
		this.gadgetList = {};
		this.killedShips = {};
		this.clientCount = 0;
		this.alive = true;
		this.engine = _engine.getEngine(this.bulletList, this.shipList, this.asteroidList, this.planetList,this.nebulaList,this.tradeShipList,this.gadgetList,this.itemList);
		this.world = new World(0,0,c.lobbyWidth,c.lobbyHeight,this.engine,this.sig);
		this.game = new Game(this.world,this.clientList,this.bulletList,this.shipList,this.asteroidList,this.planetList,this.itemList,this.nebulaList,this.tradeShipList,this.engine,this.AIList,this.gadgetList,this.sig);
	}
	join(clientID){
		var client = messenger.getClient(clientID);
		messenger.addRoomToMailBox(clientID,this.sig);
		client.join(this.sig);
		this.clientCount++;
	}
	leave(clientID){
		console.log(this.clientList[clientID] + ' left Room ' + this.sig);
		if(this.shipList[clientID] != undefined){
			database.recordShip(clientID,this.shipList[clientID]);
		} else{
			database.recordShip(clientID,this.killedShips[clientID]);
		}

		messenger.messageRoomBySig(this.sig,'playerLeft',clientID);
		var client = messenger.getClient(clientID);
		client.leave(this.sig);
		messenger.removeRoomMailBox(clientID);
		delete this.clientList[clientID];
		delete this.shipList[clientID];
		this.clientCount--;
	}
	update(dt){
		this.game.update(dt);
		this.checkForDeaths();
		this.sendUpdates();
	}
	checkForDeaths(){
		for(var shipID in this.shipList){
			var ship = this.shipList[shipID];
			if(ship.alive == false){
				var remaining = this.game.getShipCount()-1;
				this.engine.explodeObject(ship.x, ship.y, ship.explosionMaxDamage, ship.explosionRadius);
				if(ship.killedBy != null && this.shipList[ship.killedBy] != null){
					var murderer = this.shipList[ship.killedBy];
					var victim = ship;
					var murdererName = this.clientList[ship.killedBy];
					var victimName = this.clientList[shipID];

					var messageToRoom = "";

					if(murderer.isAI){
						if(!victim.isAI){
							messageToRoom = murderer.AIName +" killed " + victimName;
						} else{
							messageToRoom = murderer.AIName +" killed " + victim.AIName;
						}
					} else{
						if(!victim.isAI){
							murderer.killList.push(victimName);
							messageToRoom = murdererName + " killed " + victimName;
							messenger.toastPlayer(murderer.id,"You killed " + victimName);
						} else{
							murderer.killList.push(victimName);
							messageToRoom = murdererName + " killed " + victim.AIName;
							messenger.toastPlayer(murderer.id,"You killed " + victim.AIName);
						}
					}

					messenger.messageRoomBySig(this.sig,"eventMessage",remaining +" alive - " + messageToRoom);
				} else{
					if(ship.isAI){
						messenger.messageRoomBySig(this.sig,"eventMessage",remaining +" alive - "+ ship.AIName +" died from world damage");
					} else{
						messenger.messageRoomBySig(this.sig,"eventMessage",remaining +" alive - "+ this.clientList[shipID] + " died from world damage");
					}
				}
				this.killedShips[shipID] = this.shipList[shipID];
				delete this.shipList[shipID];
				messenger.messageRoomBySig(this.sig,'shipDeath',[shipID,ship.killedBy]);
			}
		}
	}

	sendUpdates(){
		var shipData = compressor.sendShipUpdates(this.shipList);
		var tradeShipData = compressor.sendTradeShipUpdates(this.tradeShipList);
		var bulletData = compressor.sendBulletUpdates(this.bulletList);
		var gadgetData = compressor.sendGadgetUpdates(this.gadgetList);
		var itemData = compressor.sendItemUpdates(this.itemList);
		messenger.messageRoomBySig(this.sig,"gameUpdates",{
			shipList:shipData,
			tradeShipList:tradeShipData,
			bulletList:bulletData,
			gadgetList:gadgetData,
			itemList:itemData,
			state:this.game.active,
			lobbyTimeLeft:this.game.lobbyTimeLeft,
			totalPlayers:messenger.getTotalPlayers(),
			shrinkTimeLeft:this.game.timeLeftUntilShrink
		});
	}

	checkRoom(clientID){
		for(var id in this.clientList){
			if(id == clientID){
				return true;
			}
		}
		return false;
	}
	hasSpace(){
		if(this.clientCount < this.size){
			if(!this.game.active && !this.game.gameEnded){
				return true;
			}
		}
		return false;
	}

}

class Game {
	constructor(world,clientList,bulletList,shipList,asteroidList,planetList,itemList,nebulaList,tradeShipList,engine,AIList,gadgetList,roomSig){
		this.world = world;
		this.clientList = clientList;
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.planetList = planetList;
		this.asteroidList = asteroidList;
		this.itemList = itemList;
		this.nebulaList = nebulaList;
		this.tradeShipList = tradeShipList;
		this.gadgetList = gadgetList;
		this.engine = engine;
		this.AIList = AIList;
		this.roomSig = roomSig;

		//Gamerules
		this.minPlayers = c.minPlayers;
		this.lobbyWaitTime = c.lobbyWaitTime;
		this.timeUntilShrink = c.baseTimeUntilShrink;
		this.shrinkingDurationSpeedup = c.shrinkingDurationSpeedup;
		this.timeUntilShrinkSpeedup = c.timeUntilShrinkSpeedup;

		this.timeUntilShrink = c.baseTimeUntilShrink;
		this.shrinkingDuration = c.baseShrinkingDuration;

		this.timerUntilShrink = null;
		this.shrinkingTimer = null;
		this.timeLeftUntilShrink = 60;
		this.shrinkTimeLeft = 0;
		this.shipsAlive = 0;

		this.gameEnded = false;
		this.firstPass = true;
		this.winner = null;
		this.active = false;

		this.lobbyTimer = null;
		this.lobbyTimeLeft = this.lobbyWaitTime;
		this.playNowPressed = false;
		this.readyButtonVisible = false;
		this.playerCount = 0;

		this.gameBoard = new GameBoard(world,clientList,bulletList,shipList,asteroidList,planetList,itemList,nebulaList,this.tradeShipList,this.AIList,engine,this.gadgetList,this.roomSig);
	}

	start(){
		messenger.messageRoomBySig(this.roomSig,'gameStart',null);
		this.gameBoard.clean();
		this.active = true;
		this.world.resize();
		this.world.drawFirstBound();
		this.gameBoard.populateWorld();
		this.gameBoard.resetShips();
		this.checkForAISpawn();
		this.randomLocShips();
		this.resetTimeUntilShrink();

	}
	resetTimeUntilShrink(){
		var game = this;
		if(!this.firstPass){this.timeUntilShrink *= this.timeUntilShrinkSpeedup;};
		this.timerUntilShrink = utils.getTimer(function(){game.currentlyShrinking();},this.timeUntilShrink*1000);

	}
	currentlyShrinking(){
		var game = this;
		if(!this.firstPass){this.shrinkingDuration *= this.shrinkingDurationSpeedup;};
	    this.shrinkingTimer = utils.getTimer(function(){game.resetTimeUntilShrink();},this.shrinkingDuration*1000);
	    this.world.shrinkBound();
	    this.firstPass = false;
	}

	reset(){
		this.world.reset();
		this.timerUntilShrink.reset();
	}

	gameover(){
		this.active = false;
		var winnerName = '';
		console.log("Room" + this.roomSig +"'s game has ended.");
		for(var shipID in this.shipList){
			if(!this.shipList[shipID].isAI){
				winnerName = this.clientList[shipID];
				console.log(this.clientList[shipID]+" wins!");
			} else{
				winnerName = this.shipList[shipID].AIName;
			}
			this.winner = shipID;
		}
		messenger.messageRoomBySig(this.roomSig,'eventMessage',winnerName + " wins the game!");
		this.gameEnded = true;
	}

	update(dt){
		if(this.active){
			if(this.timerUntilShrink != null){
        		this.timeLeftUntilShrink = this.timerUntilShrink.getTimeLeft().toFixed(1);
      		}
		    if(this.shrinkingTimer != null){
		        this.shrinkTimeLeft = this.shrinkingTimer.getTimeLeft().toFixed(1);
		    }
		    if(this.world.canSpawnTradeShip){
		    	this.gameBoard.spawnTradeShip();
		    	this.world.canSpawnTradeShip = false;
		    }
			if(this.checkForWin()){
				return;
			}
		} else{
			this.checkForGameStart()
		}
		this.gameBoard.update(this.active, dt);
		this.updateAI(this.active,this.shipsAlive);
		this.world.update(this.shrinkTimeLeft,dt);
	}

	checkForWin(){
		if(this.getPlayerShipCount() == 0){
			this.gameover();
			return true;
		}
		if(this.getShipCount() == 1){
			this.gameover();
			return true;
		}
		return false;
	}

	checkForGameStart(){
		if(this.playNowPressed){
			this.start();
			return;
		}
		this.getPlayerShipCount();
		var timerRunning = (this.playerCount >= this.minPlayers);
		if(!timerRunning){
			this.cancelGameStart();
			return;
		}
		this.checkForSinglePlayer();
		this.startLobbyTimer();
	}
	startLobbyTimer(){
		if(this.lobbyTimer != null && this.readyButtonVisible == false){
			this.lobbyTimeLeft = ((this.lobbyWaitTime*1000 - (Date.now() - this.lobbyTimer))/(1000)).toFixed(1);
			if(this.lobbyTimeLeft > 0){
				return;
			}
			if(this.singlePlayer){
				if(this.readyButtonVisible == false){
					this.readyButtonVisible = true;
					messenger.messageRoomBySig(this.roomSig,"showReady");
				}
				this.cancelGameStart();
				return;
			}
			this.start();
			return;
		}
		this.lobbyTimer = Date.now();
	}
	checkForSinglePlayer(){
		if(this.playerCount == 1){
			this.singlePlayer = true;
			return;
		}
		if(this.playerCount >= this.minPlayers){
			if(this.readyButtonVisible == true){
				this.readyButtonVisible = false;
				messenger.messageRoomBySig(this.roomSig,"hideReady");
			}
			this.singlePlayer = false;
			return;
		}
	}
	checkForAISpawn(){
		var spawnAmt = c.maxPlayersInRoom - this.getPlayerShipCount()
		if(c.AISpawnPlayers){
			for(var i=0;i<spawnAmt;i++){
				this.shipList[i] = this.world.spawnNewShip(i,"orange");
				this.AIList[i] = AI.setAIController(this.shipList[i],this.world,this.gameBoard);
			}
			var data = compressor.spawnAIShips(this.shipList);
			messenger.messageRoomBySig(this.roomSig,"spawnAIShips",data);
		}
	}
	updateAI(active){
		for(var sig in this.AIList){
			var aiUser = this.AIList[sig];
			aiUser.update(active);
			if(aiUser.agent.alive == false){
				delete this.AIList[sig];
			}

		}
	}
	cancelGameStart(){
		if(this.lobbyTimer != null){
			this.lobbyTimer = null;
			this.lobbyTimeLeft = this.lobbyWaitTime;
		}
	}

	getShipCount(){
		var shipCount = 0;
		for(var shipID in this.shipList){
			shipCount++;
		}
		this.shipsAlive = shipCount;
		return shipCount;
	}
	getPlayerShipCount(){
		var shipCount = 0;
		for(var shipID in this.shipList){
			if(!this.shipList[shipID].isAI){
				shipCount++;
			}
		}
		this.playerCount = shipCount;
		return shipCount;
	}
	randomLocShips(){
		if(c.randomizePlayersLocations){
			for(var shipID in this.shipList){
				var ship = this.shipList[shipID];
				var loc = this.world.findFreeLoc(ship);
				ship.newX = loc.x;
				ship.newY = loc.y;
			}
		}
	}
}

class GameBoard {
	constructor(world,clientList,bulletList,shipList,asteroidList,planetList,itemList,nebulaList,tradeShipList,AIList,engine,gadgetList,roomSig){
		this.world = world;
		this.clientList = clientList;
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.asteroidList = asteroidList;
		this.planetList = planetList;
		this.itemList = itemList;
		this.AIList = AIList;
		this.nebulaList = nebulaList;
		this.tradeShipList = tradeShipList;
		this.gadgetList = gadgetList;
		this.engine = engine;
		this.roomSig = roomSig;
	}
	update(active, dt){
		this.engine.update(dt);
		this.checkCollisions(active);
		if(active){
			this.updateTradeShips();
			this.updateAsteroids();
			this.updateItems(dt);
		}
		this.updateShips(active,dt);
		this.updateGadgets();
		this.updateBullets(dt);
	}
	updateShips(active,dt){
		var regeneratingShips = [];
		var gadgetsOnCooldown = [];
		for(var shipID in this.shipList){
			var ship = this.shipList[shipID];
			if(active){
				this.world.checkForMapDamage(ship);
			}
			ship.update(dt);
			if(ship.droppedItems.length > 0){
				this.spawnItems(ship.droppedItems);
				ship.droppedItems = [];
			}
			if(ship.regenerating || ship.powerRegen){
				regeneratingShips.push([ship.id, ship.health,ship.power]);
			}
			if(ship.gadget.coolingDown){
				gadgetsOnCooldown.push({id:ship.id,percent:ship.gadget.cooldownPercent});
			}
			if(ship.firedBullets.length != 0){
				this.generateBullets(ship.id,ship.weapon,ship.firedBullets);
				ship.firedBullets = [];
			}
			if(ship.newGadgets.length != 0){
				this.generateGadgets(ship.newGadgets);
				ship.newGadgets = [];
			}
		}
		if(gadgetsOnCooldown.length != 0){
			messenger.messageRoomBySig(this.roomSig,"gadgetCooldownUpdate",gadgetsOnCooldown);
		}
		if(regeneratingShips.length != 0){
			messenger.messageRoomBySig(this.roomSig,"shipsRegenerating",regeneratingShips);
		}
	}
	updateTradeShips(){
		var deadSigs = [];
		for(var sig in this.tradeShipList){
			var tradeShip = this.tradeShipList[sig];
			if(tradeShip.alive == false){
				this.spawnItems(tradeShip.dropItems());
				deadSigs.push(sig);
				delete this.tradeShipList[sig];
				continue;
			}
			if(tradeShip.firedBullets.length != 0){
				this.generateBullets(tradeShip.sig,tradeShip.weapon,tradeShip.firedBullets);
				tradeShip.firedBullets = [];
			}
			tradeShip.update();
		}
		if(deadSigs.length != 0){
			messenger.messageRoomBySig(this.roomSig,'terminateTradeShips',deadSigs);
		}
	}
	updateBullets(){
		var deadSigs = [];
		for(var sig in this.bulletList){
			var bullet = this.bulletList[sig];
			if(bullet.alive == false){
				deadSigs.push(sig);
				delete this.bulletList[sig];
				continue;
			}
			bullet.update();
		}
		if(deadSigs.length != 0){
			messenger.messageRoomBySig(this.roomSig,'terminateBullet',deadSigs);
		}
	}
	updateAsteroids(){
		var deadSigs = [];
		for(var asteroidSig in this.asteroidList){
			var asteroid = this.asteroidList[asteroidSig];
			if(asteroid.alive == false){
				deadSigs.push(asteroidSig);
				this.terminateAsteroid(asteroid);
				continue;
			}
			asteroid.update();
		}
		if(deadSigs.length != 0){
			messenger.messageRoomBySig(this.roomSig,'terminateAsteroids',deadSigs);
		}
	}
	updateItems(dt){
		var deadSigs = [];
		for(var itemSig in this.itemList){
			var item = this.itemList[itemSig];
			if(item.alive == false){
				deadSigs.push(itemSig);
				this.terminateItem(itemSig);
				continue;
			}
			item.update(dt);
		}
		if(deadSigs.length != 0){
			messenger.messageRoomBySig(this.roomSig,'terminateItems',deadSigs);
		}
	}
	updateGadgets(){
		var deadSigs = [];
		for(var gadgetSig in this.gadgetList){
			var gadget = this.gadgetList[gadgetSig];
			if(gadget.alive == false){
				this.terminateGadget(gadgetSig);
				deadSigs.push(gadgetSig);
				continue;
			}
			gadget.update();
			if(gadget.hasAI){
				if(gadget.AIControlled && gadget.AICreated == false){
					if(gadget.type == "Drone"){
						gadget.AICreated = true;
						this.AIList[gadget.sig] = AI.setAIDroneController(gadget,this.world,this);
					}
				}
			}

		}
		if(deadSigs.length != 0){
			messenger.messageRoomBySig(this.roomSig,'terminateGadgets',deadSigs);
		}
	}
	spawnItems(items){
		for(var i=0;i<items.length;i++){
			var sig = this.generateItemSig();
			items[i].sig = sig;
			this.itemList[sig] = items[i];
		}
		messenger.messageRoomBySig(this.roomSig,'spawnItems',compressor.spawnItems(items));
	}
	spawnTradeShip(){
		if(c.generateTradeShips){
			var loc = this.world.getTradeShipLoc();
			var sig = this.generateTradeShipSig();
			var angle = (180/Math.PI)*Math.atan2(loc.y2-loc.y1, loc.x2-loc.x1);
			var ts = new TradeShip(loc.x1,loc.y1,180,60, angle, utils.getRandomInt(c.tradeShipMinDelay,c.tradeShipMaxDelay),loc.x2,loc.y2,this.roomSig);
			ts.sig = sig;
			if(c.tradeShipAIEnabled){
				this.AIList[sig] = AI.setAITradeShipController(ts,this.world,this);
			}
			this.tradeShipList[sig] = ts;
			messenger.messageRoomBySig(this.roomSig,'spawnTradeShip',compressor.spawnTradeShip(ts));
		}
	}
	checkCollisions(active){
		//In game running
		if(active){
			var objectArray = [];
			for(var ship in this.shipList){
				_engine.preventEscape(this.shipList[ship],this.world);
				objectArray.push(this.shipList[ship]);
			}
			for(var asteroidSig in this.asteroidList){
				objectArray.push(this.asteroidList[asteroidSig]);
			}
			for(var planetSig in this.planetList){
				objectArray.push(this.planetList[planetSig]);
			}
			for(var itemSig in this.itemList){
				objectArray.push(this.itemList[itemSig]);
			}
			for(var tradeSig in this.tradeShipList){
				objectArray.push(this.tradeShipList[tradeSig]);
			}
			for(var nebulaSig in this.nebulaList){
				objectArray.push(this.nebulaList[nebulaSig]);
			}
			for(var gadgetSig in this.gadgetList){
				objectArray.push(this.gadgetList[gadgetSig]);
			}
			for(var bulletSig in this.bulletList){
				objectArray.push(this.bulletList[bulletSig]);
			}
			this.engine.broadBase(objectArray);
		}
		// In lobby state
		else{
			for(var ship in this.shipList){
				_engine.preventEscape(this.shipList[ship],this.world);
			}
		}
	}
	generateBullets(id,weapon,bullets){
		var newBullets = [];
		for(var i=0;i<bullets.length;i++){
			var bullet = bullets[i];
			if(bullet.sig == null){
				bullet.sig = this.generateBulletSig();
				newBullets.push(bullets[i]);
				setTimeout(this.terminateBullet,bullet.lifetime*1000,{sig:bullet.sig,bulletList:this.bulletList});
			}
			this.bulletList[bullet.sig] = bullet;
		}
		if(newBullets.length > 0){
			var data = compressor.weaponFired(id,weapon,newBullets);
			messenger.messageRoomBySig(this.roomSig,'weaponFired',data);
		}
	}
	generateGadgets(objects){
		for(var i=0;i<objects.length;i++){
			var sig = this.generateGadgetSig();
			this.gadgetList[sig] = objects[i];
			this.gadgetList[sig].sig = sig;

			//TODO: this is inefficient and should be done outside of the loop when more than one gadget is added
			var data = compressor.gadgetActivated(this.gadgetList[sig]);
			messenger.messageRoomBySig(this.roomSig,'gadgetActivated',data);
		}
	}

	terminateBullet(packet){
		if(packet.bulletList[packet.sig] != undefined){
			if(packet.bulletList[packet.sig].isBeam){
				return;
			}
			packet.bulletList[packet.sig].alive = false;
		}
	}
	terminateAsteroid(asteroid){
		if(asteroid.items.length > 0){
			this.spawnItems(asteroid.items);
		}
		delete this.asteroidList[asteroid.sig];
	}
	terminateItem(itemSig){
		delete this.itemList[itemSig];
	}
	terminateGadget(gadgetSig){
		delete this.gadgetList[gadgetSig];
	}
	clean(){
		//Remove all active bullets from the scene
		for(var sig in this.bulletList){
			this.bulletList[sig].alive = false;
		}
		//Reset all weapon cooldowns
		for(var id in this.shipList){
			var ship = this.shipList[id];
			ship.weapon.resetCoolDown();
		}
	}
	resetShips(){
		for(var shipID in this.shipList){
			var ship = this.shipList[shipID];
			ship.health = c.playerBaseHealth;
			ship.power = c.playerBasePower;
			ship.gadget.reset();
			messenger.messageRoomBySig(this.roomSig,"gadgetCooldownStop",{id:ship.id});
		}
	}
	generateBulletSig(){
		var sig = utils.getRandomInt(0,99999);
		if(this.bulletList[sig] == null || this.bulletList[sig] == undefined){
			return sig;
		}
		return this.generateBulletSig();
	}
	generateAsteroidSig(){
		var sig = utils.getRandomInt(0,99999);
		if(this.asteroidList[sig] == null || this.asteroidList[sig] == undefined){
			return sig;
		}
		return this.generateAsteroidSig();
	}
	generateGadgetSig(){
		var sig = utils.getRandomInt(0,99999);
		if(this.gadgetList[sig] == null || this.gadgetList[sig] == undefined){
			return sig;
		}
		return this.generateGadgetSig();
	}
	generateItemSig(){
		var sig = utils.getRandomInt(0,99999);
		if(this.itemList[sig] == null || this.itemList[sig] == undefined){
			return sig;
		}
		return this.generateItemSig();
	}
	generateNebulaSig(){
		var sig = utils.getRandomInt(0,99999);
		if(this.nebulaList[sig] == null || this.nebulaList[sig] == undefined){
			return sig;
		}
		return this.generateNebulaSig();
	}

	generatePlanetSig(){
		var sig = utils.getRandomInt(0,99999);
		if(this.planetList[sig] == null || this.planetList[sig] == undefined){
			return sig;
		}
		return this.generatePlanetSig();
	}
	generateTradeShipSig(){
		var sig = utils.getRandomInt(0,99999);
		if(this.tradeShipList[sig] == null || this.tradeShipList[sig] == undefined){
			return sig;
		}
		return this.generateTradeShipSig();
	}
	populateWorld(){
		if(c.generateAsteroids){
			for(var i = 0; i<c.asteroidAmt;i++){
				var sig = this.generateAsteroidSig();
				var asteroid = new Asteroid(0,0,utils.getRandomInt(c.asteroidMinSize,c.asteroidMaxSize),sig,this.roomSig);
				var loc = this.world.findFreeLoc(asteroid);
				asteroid.x = loc.x;
				asteroid.y = loc.y;
				this.asteroidList[sig] = asteroid;
			}
			var data = compressor.spawnAsteroids(this.asteroidList);
			messenger.messageRoomBySig(this.roomSig,"spawnAsteroids",data);
		}
		if(c.generatePlanets){
			for(var i = 0; i<c.planetAmt;i++){
				var sig = this.generatePlanetSig();
				var planet = new Planet(0,0,utils.getRandomInt(c.planetMinSize,c.planetMaxSize),sig);
				var loc = this.world.findFreeLoc(planet);
				planet.x = loc.x;
				planet.y = loc.y;
				this.planetList[sig] = planet;
			}
			var data = compressor.spawnPlanets(this.planetList);
			messenger.messageRoomBySig(this.roomSig,"spawnPlanets",data);
		}
		if(c.generateNebulas){
			for(var i = 0; i<c.nebulaAmt;i++){
				var sig = this.generateNebulaSig();
				var nebula = new Nebula(0,0,utils.getRandomInt(c.nebulaMinSize,c.nebulaMaxSize),sig);
				var loc = this.world.findFreeLoc(nebula);
				nebula.x = loc.x;
				nebula.y = loc.y;
				this.nebulaList[sig] = nebula;
			}
			var data = compressor.spawnNebula(this.nebulaList);
			messenger.messageRoomBySig(this.roomSig,"spawnNebula",data);
		}
	}
}

class Shape {
	constructor(x,y,color){
		this.x = x;
		this.y = y;
		this.color = color;
	}
	inBounds(shape){
		if(shape.radius){
			return this.testCircle(shape);
		}
		if(shape.width){
			return this.testRect(shape);
		}
		return false;
	}
}

class Rect extends Shape{
	constructor(x,y,width,height, angle, color){
		super(x,y,color);
		this.width = width;
		this.height = height;
		this.angle = angle;
		this.vertices = this.getVertices();

	}

	getVertices(){
		var vertices = [];
		var a = {x:-this.width/2, y: -this.height/2},
	        b = {x:this.width/2, y: -this.height/2},
	        c = {x:this.width/2, y: this.height/2},
	        d = {x:-this.width/2, y: this.height/2};
		vertices.push(a, b, c, d);

		var cos = Math.cos(this.angle * Math.PI/180);
	    var sin = Math.sin(this.angle * Math.PI/180);

		var tempX, tempY;
	    for (var i = 0; i < vertices.length; i++){
	        var vert = vertices[i];
	        tempX = vert.x * cos - vert.y * sin;
	        tempY = vert.x * sin + vert.y * cos;
	        vert.x = this.x + tempX;
	        vert.y = this.y + tempY;
	    }
		return vertices;
	}
	pointInRect(x, y){
	    var ap = {x:x-this.vertices[0].x, y:y-this.vertices[0].y};
	    var ab = {x:this.vertices[1].x - this.vertices[0].x, y:this.vertices[1].y - this.vertices[0].y};
	    var ad = {x:this.vertices[3].x - this.vertices[0].x, y:this.vertices[3].y - this.vertices[0].y};

		var dotW = utils.dotProduct(ap, ab);
		var dotH = utils.dotProduct(ap, ad);
		if ((0 <= dotW) && (dotW <= utils.dotProduct(ab, ab)) && (0 <= dotH) && (dotH <= utils.dotProduct(ad, ad))){
			return true;
		}
	    return false;
	}

	getExtents(){
		var minX = this.vertices[0].x,
		maxX = minX,
		minY = this.vertices[0].y,
		maxY = minY;
		for (var i = 0; i < this.vertices.length-1; i++){
			var vert = this.vertices[i];
			minX = (vert.x < minX) ? vert.x : minX;
			maxX = (vert.x > maxX) ? vert.x : maxX;
			minY = (vert.y < minY) ? vert.y : minY;
			maxY = (vert.y > maxY) ? vert.y : maxY;
		}
		return {minX, maxX, minY, maxY};
	}
	testRect(rect){
		for (var i = 0; i < this.vertices.length; i++){
	        if(rect.pointInRect(this.vertices[i].x,this.vertices[i].y)){
	            return true;
	        }
	    }
	    for (var i = 0; i < rect.vertices.length; i++){
	        if(this.pointInRect(rect.vertices[i].x,rect.vertices[i].y)){
	            return true;
	        }
	    }
        return false;
	}
	testCircle(circle){
		return circle.testRect(this);
	}
}

class Circle extends Shape{
	constructor(x,y,radius,color){
		super(x,y,color);
		this.radius = radius;
	}
	getExtents(){
		return {minX: this.x - this.radius, maxX: this.x + this.radius, minY: this.y - this.radius, maxY: this.y + this.radius};
	}

	testCircle(circle){
		var objX1,objY1,objX2,objY2,distance;
		objX1 = this.newX || this.x;
		objY1 = this.newY || this.y;
		objX2 = circle.newX || circle.x;
		objY2 = circle.newY || circle.y;
		distance = utils.getMag(objX2 - objX1,objY2 - objY1);
	  	distance -= this.radius;
		distance -= circle.radius;
		if(distance <= 0){
			return true;
		}
		return false;
	}

	testRect(rect){
		if(this.lineIntersectCircle({x:rect.x, y:rect.y}, {x:rect.newX, y:rect.newY})){
			return true;
		}
		if(rect.pointInRect(this.x, this.y)){
			return true;
		}

		if(this.lineIntersectCircle(rect.vertices[0], rect.vertices[1]) ||
	       this.lineIntersectCircle(rect.vertices[1], rect.vertices[2]) ||
	       this.lineIntersectCircle(rect.vertices[2], rect.vertices[3]) ||
	       this.lineIntersectCircle(rect.vertices[3], rect.vertices[0])){
	        return true;
	    }

		for (var i = 0; i < rect.vertices.length; i++){
	        var distsq = utils.getMagSq(this.x, this.y, rect.vertices[i].x, rect.vertices[i].y);
	        if (distsq < Math.pow(this.radius, 2)){
	            return true;
	        }
	    }
		return false;

	}
	lineIntersectCircle(a, b){

	    var ap, ab, dirAB, magAB, projMag, perp, perpMag;
	    ap = {x: this.x - a.x, y: this.y - a.y};
	    ab = {x: b.x - a.x, y: b.y - a.y};
	    magAB = Math.sqrt(utils.dotProduct(ab,ab));
	    dirAB = {x: ab.x/magAB, y: ab.y/magAB};

	    projMag = utils.dotProduct(ap, dirAB);

	    perp = {x: ap.x - projMag*dirAB.x, y: ap.y - projMag*dirAB.y};
	    perpMag = Math.sqrt(utils.dotProduct(perp, perp));
	    if ((0 < perpMag) && (perpMag < this.radius) && (0 <  projMag) && (projMag < magAB)){
	        return true;
	    }
	    return false;
	}


	getRandomCircleLoc(minR,maxR){
		var r = Math.floor(Math.random()*(maxR - minR));
		var angle = Math.floor(Math.random()*(Math.PI*2 - 0));
		return {x:r*Math.cos(angle)+this.x,y:r*Math.sin(angle)+this.y};
	}
}

class World extends Rect{
	constructor(x,y,width,height,engine,roomSig){
		super(x,y,width,height, 0, "orange");
		this.baseBoundRadius = width;
		this.damageRate = c.damageTickRate;
		this.damagePerTick = c.damagePerTick;
		this.shrinking = false;
		this.canSpawnTradeShip = true;
		this.whiteBound = new WhiteBound(width/2,height/2,this.baseBoundRadius);
		this.blueBound = new BlueBound(width/2,height/2,this.baseBoundRadius);
		this.center = {x:width/2,y:height/2};
		this.engine = engine;
		this.roomSig = roomSig;
	}
	update(timeLeft,dt){
		this.updateBounds(timeLeft,dt);
	}
	updateBounds(timeLeft,dt){
		if(this.shrinking){
	      this.blueBound.velX = (this.whiteBound.x - this.blueBound.x)/((1/dt)*timeLeft);
	      this.blueBound.velY = (this.whiteBound.y - this.blueBound.y)/((1/dt)*timeLeft);
	      this.blueBound.x += this.blueBound.velX;
	      this.blueBound.y += this.blueBound.velY;
      	  this.blueBound.radius -= (this.blueBound.radius - this.whiteBound.radius)/((1/dt)*timeLeft);

	      if(this.blueBound.radius <= this.whiteBound.radius){
          	this.blueBound.radius = this.whiteBound.radius;
          	this.blueBound.x = this.whiteBound.x;
          	this.blueBound.y = this.whiteBound.y;
          	this.shrinking = false;
          	this.drawNextBound();
	      }
	      var blueBoundData = compressor.shrinkBound(this.blueBound);
      	  messenger.messageRoomBySig(this.roomSig,"blueBoundShrinking",blueBoundData);
    	}
	}
	resize(){
		this.width = c.worldWidth;
		this.height = c.worldHeight;
		this.baseBoundRadius = this.width;
		this.center = {x:this.width/2,y:this.height/2};
		this.whiteBound = new WhiteBound(this.width/2,this.height/2,this.baseBoundRadius);
		this.blueBound = new BlueBound(this.width/2,this.height/2,this.baseBoundRadius);
		this.engine.setWorldBounds(this.width,this.height);
		var data = compressor.worldResize(this);
		messenger.messageRoomBySig(this.roomSig,'worldResize',data);
	}

	drawNextBound(){
		this.whiteBound = this._drawWhiteBound();
		var whiteBoundData = compressor.shrinkBound(this.whiteBound);
      	messenger.messageRoomBySig(this.roomSig,"whiteBoundShrinking",whiteBoundData);
		this.canSpawnTradeShip = true;
	}
	drawFirstBound(){
		var newRadius = this.blueBound.radius/3;
		var x = utils.getRandomInt(this.x+newRadius,this.x+this.width-newRadius);
		var y = utils.getRandomInt(this.y+newRadius,this.y+this.height-newRadius);
		this.whiteBound = new WhiteBound(x,y,newRadius);
		var whiteBoundData = compressor.shrinkBound(this.whiteBound);
      	messenger.messageRoomBySig(this.roomSig,"whiteBoundShrinking",whiteBoundData);
	}
	_drawWhiteBound(){
		var newRadius = this.blueBound.radius/2;
		var distR = this.blueBound.radius-newRadius;
		var loc = this.blueBound.getRandomCircleLoc(0,distR);
		var whiteBound = new WhiteBound(loc.x,loc.y,newRadius);
		return whiteBound;
	}
	findFreeLoc(obj){
		var loc = this.getSafeLoc(obj.width || obj.radius);
		if(this.engine.checkCollideAll(loc, obj)){
			return this.findFreeLoc(obj);
		}
		return loc;
	}
	getSafeLoc(size){
		var objW = size + c.playerBaseRadius*3;
		var objH = size + c.playerBaseRadius*3;
		return {x:Math.floor(Math.random()*(this.width - 2*objW - this.x)) + this.x + objW, y:Math.floor(Math.random()*(this.height - 2*objH - this.y)) + this.y + objH};
	}
	getRandEdgeLoc(pad){
		var loc = {x: null,y: null};
		if (0.5 - Math.random() > 0){
			//left or right edge
			if (0.5 - Math.random() > 0){
				//left
				loc.x = -pad;
			}
			else{
				//right
				loc.x = this.width + pad;
			}
			loc.y = Math.floor(Math.random()*(this.height));
		}
		else{
			//top or bottom edge
			if (0.5 - Math.random() > 0){
				//top
				loc.y = -pad;
			}
			else{
				//bot
				loc.y = this.height + pad;
			}
			loc.x = Math.floor(Math.random()*(this.width));
		}
		return loc;
	}
	getRandomLoc(){
		return {x:Math.floor(Math.random()*(this.width - this.x)) + this.x, y:Math.floor(Math.random()*(this.height - this.y)) + this.y};
	}
	getTradeShipLoc(){
		var loc = {x1:null,y1:null,x2:null,y2:null};
		var pad = 500;
		var loc1 = this.getRandEdgeLoc(pad);
		loc.x1 = loc1.x;
		loc.y1 = loc1.y;

		var dx, dy, dd;
		dx = this.whiteBound.x - loc.x1;
		dy = this.whiteBound.y - loc.y1;
		dd = utils.getMag(dx, dy);

		var perpx, perpy;
		perpx = dy/dd;
		perpy = -dx/dd;

		var xc, yc;
		xc = this.whiteBound.x + c.tradeShipSpawnTolerance * this.whiteBound.radius * perpx;
		yc = this.whiteBound.y + c.tradeShipSpawnTolerance * this.whiteBound.radius * perpy;

		var xd, yd;
		xd = this.whiteBound.x - c.tradeShipSpawnTolerance * this.whiteBound.radius * perpx;
		yd = this.whiteBound.y - c.tradeShipSpawnTolerance * this.whiteBound.radius * perpy;

		if (loc.y1 >= 0 && loc.y1 <= this.height){
			//left or right start
			if (loc.x1 < 0){
				//starting left
				loc.x2 = this.width + pad;
			}
			else{
				loc.x2 = -pad;
			}
			var yt = ((yc - loc.y1)/(xc - loc.x1))*(loc.x2 - loc.x1) + loc.y1;
			var yb = ((yd - loc.y1)/(xd - loc.x1))*(loc.x2 - loc.x1) + loc.y1;

			loc.y2 = utils.getRandomInt(Math.min(yt,yb), Math.max(yt,yb));
		}
		else{
			//top or bot start;
			if (loc.y1 < 0){
				loc.y2 = this.height + pad;
			}
			else{
				loc.y2 = -pad;
			}
			var xt = ((xc - loc.x1)/(yc - loc.y1))*(loc.y2 - loc.y1) + loc.x1;
			var xb = ((xd - loc.x1)/(yd - loc.y1))*(loc.y2 - loc.y1) + loc.x1;

			loc.x2 = utils.getRandomInt(Math.min(xt,xb), Math.max(xt,xb));
		}
		return loc;
	}
	shrinkBound(){
		this.shrinking = true;
	}
	reset(){
		this.whiteBound = new WhiteBound(this.width/2,this.height/2,this.baseBoundRadius);
		this.blueBound = new BlueBound(this.width/2,this.height/2,this.baseBoundRadius);
	}
	checkForMapDamage(object){
		if(this.blueBound.inBounds(object) == false){
			if(object.damageTimer == false){
				object.damageTimer = true;
				setTimeout(this.dealDamage,this.damageRate*1000,{object:object,
					bounds:this.blueBound,
					rate:this.damageRate,
					damage:this.damagePerTick,
					callback:this.dealDamage});
			}
		}
	}
	dealDamage(packet){
		if(packet.bounds.inBounds(packet.object)){
			packet.object.damageTimer = false;
		} else {
			packet.object.takeDamage(packet.damage);
			setTimeout(packet.callback,packet.rate*1000,packet);
		}
	}

	spawnNewShip(id,color){
		var ship = new Ship(0,0, 90, color, id,this.engine,this.roomSig);
		var loc = this.findFreeLoc(ship);
		ship.x = loc.x;
		ship.y = loc.y;
		return ship;
	}
}

class Bound extends Circle{
	constructor(x,y,radius,color){
		super(x,y,radius,color);
		this.velX = 0;
		this.velY = 0;
		this.isBound = true;
	}
}

class WhiteBound extends Bound{
	constructor(x,y,radius){
		super(x,y,radius,'white');
	}
}

class BlueBound extends Bound{
	constructor(x,y,radius){
		super(x,y,radius,'blue');
	}
}



class Ship extends Circle{
	constructor(x,y, angle, color, id,engine, roomSig){
		super(x, y, c.playerBaseRadius, color);
		this.baseHealth = c.playerBaseHealth;
		this.health = this.baseHealth;

		this.passives = [];
		this.enabled = true;
		this.isShip = true;

		this.hacker = null;

		this.basePower = c.playerBasePower;
		this.power = this.basePower;
		this.powerRegenAmt = c.playerPowerRegenAmt;
		this.powerRegenRate = c.playerPowerRegenRate;
		this.powerRegenTimer = Date.now() - this.powerRegenRate;
		this.powerRegen = false;

		this.fireWeapon = false;
		this.stopWeapon = false;
		this.firedBullets = [];
		this.useGadget = false;
		this.stopGadget = false;
		this.newGadgets = [];

		this.baseColor = color;
		this.glowColor = color;
		this.angle = angle;
		this.engine = engine;
		this.isHit = false;
		this.speedBoost = 0;
		this.boostList = {};
		this.damageTimer = false;
		this.moveForward = false;
		this.moveBackward = false;
		this.turnLeft = false;
		this.turnRight = false;
		this.alive = true;
		this.isHiding = false;
		this.id = id;
		this.killList = [];
		this.killedBy = null;
		this.shield = null;
		this.newX = this.x;
		this.newY = this.y;
		this.maxVelocity = c.playerMaxSpeed;
		this.acel = c.playerBaseAcel;
		this.dragCoeff = c.playerDragCoeff;
		this.brakeCoeff = c.playerBrakeCoeff;
		this.velX = 0;
		this.velY = 0;
		this.droppedItems = [];
		this.dt = 0;

		this.roomSig = roomSig;
		this.explosionRadius = c.playerExplosionRadius;
		this.explosionMaxDamage = c.playerExplosionMaxDamage;


		this.regenTimeout = c.playerHealthRegenTime;
		this.regenTimer = null;
		this.regenRate = c.playerHealthRegenRate;
		this.regenerating = false;

		this.appliedAttributes = {
			health : c.attributeHealthStart,
			speed : c.attributeSpeedStart,
			weapon: c.attributeWeaponStart
		};

		this.gadget = new PulseWave(this.engine,this.id);

		if(c.playerSpawnWeapon == "Blaster"){
			this.weapon = new Blaster(this.id);
		}
		if(c.playerSpawnWeapon == "PhotonCannon"){``
			this.weapon = new PhotonCannon(this.id);
		}
		if(c.playerSpawnWeapon == "MassDriver"){
			this.weapon = new MassDriver(this.id);
		}
		this.currentCritBonus = 0;
		this.weapon.level = c.playerSpawnWeaponLevel;
	}
	update(dt){
		if(!this.alive){
			return;
		}
		this.dt = dt;
		this.move();
		this.checkHP();
		this.regenPower();
		this.checkFireState();
		this.checkBoostList();
		this.checkKills();
		this.gadget.update();
	}
	changeWeapon(name){
		switch(name){
			case "Blaster":{
				this.weapon = new Blaster(this.id);
				break;
			}
			case "PhotonCannon":{
				this.weapon = new PhotonCannon(this.id);
				break;
			}
			case "MassDriver":{
				this.weapon = new MassDriver(this.id);
				break;
			}
			case "ParticleBeam":{
				this.weapon = new ParticleBeam(this.id);
				break;
			}
			default:{
				this.weapon = new Blaster(this.id);
				break;
			}
		}
		this.weapon.equip();
		var data = compressor.equipItem(this.weapon);
		messenger.messageRoomBySig(this.roomSig,"equipItem",data);
	}
	changeGadget(name){
		switch(name){
			case "DirectionalShield":{
				this.deactivateGadget();
				this.gadget = new DirectionalShield(this.engine,this.id);
				break;
			}
			case "HackingDrone":{
				this.deactivateGadget();
				this.gadget = new HackingDrone(this.engine,this.id);
				break;
			}
			case "PulseWave":{
				this.deactivateGadget();
			 	this.gadget = new PulseWave(this.engine,this.id);
				break;
			}
			default:{
				this.deactivateGadget();
				this.gadget = new DirectionalShield(this.engine,this.id);
				break;
			}
		}
		messenger.messageRoomBySig(this.roomSig,"changeGadget",{id:this.id,name:name});
		messenger.messageRoomBySig(this.roomSig,"gadgetCooldownStop",{id:this.id});
	}

	applyPassive(passiveInt){
		if(this.passives[passiveInt] == c.passivesEnum.HealthBoost){
			this.baseHealth = c.playerBaseHealth + 15;
			this.health = this.baseHealth;
			messenger.messageRoomBySig(this.roomSig,"shipHealth",{health:this.health,id:this.id});
		}
		if(this.passives[passiveInt] == c.passivesEnum.PowerBoost){
			this.basePower = c.playerBasePower + 15;
			this.power = this.basePower;
			messenger.messageRoomBySig(this.roomSig,"shipPower",{power:this.power,id:this.id});
		}
	}
	removePassive(passiveInt){
		if(this.passives[passiveInt] == c.passivesEnum.HealthBoost){
			this.baseHealth = c.playerBaseHealth
			this.health = this.baseHealth;
			messenger.messageRoomBySig(this.roomSig,"shipHealth",{health:this.health,id:this.id});
		}
		if(this.passives[passiveInt] == c.passivesEnum.PowerBoost){
			this.basePower = c.playerBasePower;
			this.power = this.basePower;
			messenger.messageRoomBySig(this.roomSig,"shipPower",{power:this.power,id:this.id});
		}
	}

	equipPassive(newPassive,oldPassive){
		if(this.passives.length == 2){
			this.swapPassive(newPassive,oldPassive);
			return;
		}
		var newEquip;
		for(var pass in c.passivesEnum){
			if(newPassive == c.passivesEnum[pass]){
				newEquip = newPassive;
			}
		}
		if(newEquip == null){
			console.log("Error: Tried to equip a passive that is not in enum");
			return;
		}
		this.passives.push(newEquip);
		this.applyPassive(newEquip);

	}
	isPassiveEquiped(passiveInt){
		for(var i=0;i<2;i++){
			if(this.passives[i] == passiveInt){
				return true;
			}
		}
		return false;
	}
	swapPassive(newPassive,oldPassive){
		if(oldPassive == null){
			return;
		}
		if(this.isPassiveEquiped(newPassive)){
			console.log("Error: Tried to equip a passive that is already equiped");
			return;
		};
		if(!this.isPassiveEquiped(oldPassive)){
			console.log("Error: Tried to swap a passive that isn't currently equiped");
			return;
		}
		var index = this.passives.indexOf(oldPassive);
		this.removePassive(index);
		this.passives[index] = newPassive;
		this.applyPassive(index);
	}

	equip(item){
		if(item instanceof AttributeItem){
			if(item instanceof HealthAttribute){
				if(this.appliedAttributes.health < c.attributeMaxAmount){
					this.appliedAttributes.health += 1;
					this.baseHealth += c.attributeAmountHealth;
					this.heal(c.attributeAmountHealth);
					messenger.messageRoomBySig(this.roomSig,"attributeApplied",{id:this.id,type:"health"});
				}
				return;
			}
			if(item instanceof SpeedAttribute){
				if(this.appliedAttributes.speed < c.attributeMaxAmount){
					this.appliedAttributes.speed += 1;
					messenger.messageRoomBySig(this.roomSig,"attributeApplied",{id:this.id,type:"speed"});
				}
				return;
			}
			if(item instanceof WeaponAttribute){
				if(this.appliedAttributes.weapon < c.attributeMaxAmount){
					this.currentCritBonus += c.attributeWeaponCritBonusAmount;
					this.weapon.powerCost -= c.attributeWeaponPowerCostReduction;
					this.appliedAttributes.weapon += 1;
					messenger.messageRoomBySig(this.roomSig,"attributeApplied",{id:this.id,type:"weapon"});
				}
				return;
			}
		}

		if(item instanceof ShieldItem){
			if(this.shield == null){
				this.shield = new Shield(this.id);
				this.shield.equip();
				var data = compressor.equipItem(this.shield);
				messenger.messageRoomBySig(this.roomSig,"equipItem",data);
				return;
			}
			if(this.shield instanceof Shield){
				this.shield.upgrade();
				var data = compressor.updateItem(item,this.shield);
				messenger.messageRoomBySig(this.roomSig,"updateItem",data);
				return;
			}
		}
		if(item instanceof BlasterItem){
			if(this.weapon instanceof Blaster){
				this.weapon.upgrade();
				var data = compressor.updateItem(item,this.weapon);
				messenger.messageRoomBySig(this.roomSig,"updateItem",data);
				return;
			}
			//this.droppedItems.push(this.weapon.drop(this.x,this.y,this.weapon.level));
			this.weapon = new Blaster(this.id,item.level);
			this.weapon.equip();
			var data = compressor.equipItem(this.weapon);
			messenger.messageRoomBySig(this.roomSig,"equipItem",data);
			return;
		}
		if(item instanceof PhotonCannonItem){
			if(this.weapon instanceof PhotonCannon){
				this.weapon.upgrade();
				var data = compressor.updateItem(item,this.weapon);
				messenger.messageRoomBySig(this.roomSig,"updateItem",data);
				return;
			}
			//this.droppedItems.push(this.weapon.drop(this.x,this.y,this.weapon.level));
			this.weapon = new PhotonCannon(this.id,item.level);
			this.weapon.equip();
			var data = compressor.equipItem(this.weapon);
			messenger.messageRoomBySig(this.roomSig,"equipItem",data);
			return;
		}
		if(item instanceof MassDriverItem){
			if(this.weapon instanceof MassDriver){
				this.weapon.upgrade();
				var data = compressor.updateItem(item,this.weapon);
				messenger.messageRoomBySig(this.roomSig,"updateItem",data);
				return;
			}
			//this.droppedItems.push(this.weapon.drop(this.x,this.y,this.weapon.level));
			this.weapon = new MassDriver(this.id,item.level);
			this.weapon.equip();
			var data = compressor.equipItem(this.weapon);
			messenger.messageRoomBySig(this.roomSig,"equipItem",data);
			return;
		}

	}
	regenPower(){
		if(this.powerRegenRate - (Date.now() - this.powerRegenTimer) > 0){
			return;
		}
		this.powerRegenTimer = Date.now();
		if(this.power < this.basePower){
			this.powerRegen = true;
			this.power += this.powerRegenAmt;
		} else{
			this.powerRegen = false;
		}
		if(this.power > this.basePower){
			this.power = this.basePower;
		}
	}
	regenHealth(){
		if(this.health < this.baseHealth){
			this.regenerating = true;
			this.health += this.regenRate;
		}
		else{
			this.regenerating = false;
		}
		if(this.health > this.baseHealth){
			this.health = this.baseHealth;
		}
	}
	checkPower(amt){
		if(this.power - amt < 0){
			return false;
		}
		this.power -= amt;
		return true;
	}
	heal(amt){
		if(this.health < this.baseHealth){
			if(this.health+amt > this.baseHealth){
				this.health = this.baseHealth;
			} else{
				this.health += amt;
			}
		}
		messenger.messageRoomBySig(this.roomSig,"shipHealth",{health:this.health,id:this.id});
	}
	applyBoost(type,amt,duration,msg,exitMsg,refreshMsg){
		switch(type){
			case "speed":{
				//Check to see if the player already has the boost
				if(this.speedBoost == amt){
					messenger.toastPlayer(this.id,refreshMsg);
				} else{
					messenger.toastPlayer(this.id,msg);
					this.speedBoost = amt;
				}
				break;
			}
		}

		this.boostList[type] = {exitMsg:exitMsg,duration:duration,applyDate:Date.now(),type:type};
	}
	removeBoost(type){
		switch(type){
			case "speed":{
				this.speedBoost = 0;
				break;
			}
		}
	}
	fire(){
		var x = this.x + (this.radius * Math.cos((this.weapon.angle + 90) * Math.PI/180));
		var y = this.y + (this.radius * Math.sin((this.weapon.angle + 90) * Math.PI/180));

		var _bullets;
		if(this.weapon.name == "PhotonCannon" || this.weapon.name == "ParticleBeam"){
			_bullets = this.weapon.fire(x,y,this.weapon.angle, this.baseColor,this.id,this.power,this.currentCritBonus);
		} else{
			_bullets = this.weapon.fire(x,y,this.weapon.angle, this.baseColor,this.id,this.currentCritBonus);
		}
		if(_bullets == null){
			return;
		}
		if(!this.checkPower(this.weapon.powerCost)){
			this.stopFire();
			return;
		}
		for(var i=0;i<_bullets.length;i++){
			this.firedBullets.push(_bullets[i]);
		}
	}
	stopFire(){
		this.fireWeapon = false;
		this.stopWeapon = false;
		if(this.weapon.name == "PhotonCannon"){
			var x = this.x + this.radius * Math.cos((this.weapon.angle + 90) * Math.PI/180);
			var y = this.y + this.radius * Math.sin((this.weapon.angle + 90) * Math.PI/180);
			var _bullets = this.weapon.stopFire(x,y,this.weapon.angle, this.baseColor,this.id,this.currentCritBonus);
			if(_bullets == null){
				return;
			}
			if(!this.checkPower(this.weapon.powerCost)){
				return;
			}
			for(var i=0;i<_bullets.length;i++){
				this.firedBullets.push(_bullets[i]);
			}
		}
		if(this.weapon.name == "ParticleBeam"){
			this.weapon.stopFire();
		}
	}
	activateGadget(){
		var objects = this.gadget.activate(this.x,this.y,this.weapon.angle);
		if(objects == null){
			return;
		}
		if(objects.length){
			for(var i=0;i<objects.length;i++){
				this.newGadgets.push(objects[i]);
			}
		} else{
			this.newGadgets.push(objects);
		}
		messenger.messageRoomBySig(this.roomSig,"gadgetCooldownStart",{id:this.id});
	}
	deactivateGadget(){
		this.useGadget = false;
		this.stopGadget = false;

		var objects = this.gadget.deactivate(this.x,this.y);
		if(objects == null){
			return;
		}
		if(objects.length){
			for(var i=0;i<objects.length;i++){
				this.newGadgets.push(objects[i]);
			}
		} else{
			this.newGadgets.push(objects);
		}
	}
	move(){
		this.x = this.newX;
		this.y = this.newY;
	}
	handleHit(object){
		if(object.isWall){
			messenger.messageUser(this.id,"collideWithObject");
			_engine.preventMovement(this,object,this.dt);
		}
		if(object.isNebula){
			//this.isHiding = true;
			//TODO Fix hiding messenger.messageRoomBySig(this.roomSig,"shipHiding",this.id);
			//_engine.slowDown(this,this.dt,object.slowAmt);
			return;
		}
		if(object.owner != this.id && object.alive && object.damage != null){
			
			if(this.shield != null && this.shield.alive){
				this.shield.handleHit(object);
				if(this.shield.alive){
					return;
				}
				this.takeDamage(this.shield.leftOverDamage);
				messenger.messageRoomBySig(this.roomSig,'updateShield',compressor.updateShield(this.shield));
				this.shield = null;
			} else{
				this.takeDamage(object.damage);
			}

			if(this.health < 1){
				this.iDied(object.owner);
			}
			messenger.messageUser(object.owner,"shotLanded",{id:this.id,damage:object.damage,crit:(object.isCrit == true)});
		}
	}

	takeDamage(damage){
		if(this.hacker != null && this.hacker.alive){
			this.hacker.checkBreakDisable();
		}
		this.regenerating = false;
		this.regenTimer = Date.now();
		this.health -= Math.abs(damage);
		messenger.messageRoomBySig(this.roomSig,"shipHealth",{health:this.health,id:this.id});
		this.checkHP();
	}
	iDied(killerID){
		if(killerID){
			this.killedBy = killerID;
		}
		this.alive = false;
		this.dropAttributes();
	}
	dropAttributes(){
		var maxPossible = c.attributeMaxAmount*3;
		var scaleFactor = maxPossible/c.attributeShipDropAmount;
		var health = 0;

		if(this.appliedAttributes.health > 0){
			health = Math.ceil((this.appliedAttributes.health / maxPossible) * scaleFactor);
		}

		var speed = 0;
		if(this.appliedAttributes.speed > 0){
			speed =  Math.ceil((this.appliedAttributes.speed / maxPossible) * scaleFactor);
		}

		var weapon = 0;
		if(this.appliedAttributes.weapon > 0){
			weapon =  Math.ceil((this.appliedAttributes.weapon / maxPossible) * scaleFactor);
		}

		for(var i=0;i<health;i++){
			this.droppedItems.push(new HealthAttribute(this.x,this.y, utils.getRandomInt(0, 359), this.velX, this.velY, utils.getRandomInt(c.itemMinSpeed,c.itemMaxSpeed)));
		}
		for(var i=0;i<speed;i++){
			this.droppedItems.push(new SpeedAttribute(this.x,this.y, utils.getRandomInt(0, 359), this.velX, this.velY, utils.getRandomInt(c.itemMinSpeed,c.itemMaxSpeed)));
		}
		for(var i=0;i<weapon;i++){
			this.droppedItems.push(new WeaponAttribute(this.x,this.y, utils.getRandomInt(0, 359), this.velX, this.velY, utils.getRandomInt(c.itemMinSpeed,c.itemMaxSpeed)));
		}
	}
	checkHP(){
		var timeElapsed = Date.now() - this.regenTimer;
		if (timeElapsed > this.regenTimeout){
			this.regenHealth();
		}
		if(this.health < 1){
			this.alive = false;
		}
	}
	checkFireState(){

		if(!this.enabled){
			return;
		}
		if(this.fireWeapon){
			this.fire();
		}
		if(this.stopWeapon){
			this.stopFire();
		}
		if(this.useGadget){
			this.activateGadget();
		}
		if(this.stopGadget){
			this.deactivateGadget();
		}
	}
	checkKills(){
		if(this.killList.length >= 1){
			this.color = "#ffb84d";
		}
		if(this.killList.length >= 3){
			this.color = "#bfbfbf";
		}
		if(this.killList.length >= 5){
			this.color = "#806c00";
		}
		if(this.killList.length >= 10){
			this.color = "#ffffff";
		}
	}
	checkBoostList(){
		for(var sig in this.boostList){
			var boost = this.boostList[sig];
			if(boost.duration*1000 - (Date.now() - boost.applyDate) < 0){
				messenger.toastPlayer(this.id,boost.exitMsg);
				this.removeBoost(boost.type);
				delete this.boostList[sig];
			}
		}
	}
	enable(){
		if(this.enabled == false){
			this.enabled = true;
		}
	}
	disable(){
		if(this.enabled){
			this.enabled = false;
		}
	}
	getSpeedBonus(){
		if(this.appliedAttributes.speed == 0){
			return 0;
		}
		return c.attributeMoveSpeedBonus*this.appliedAttributes.speed;
	}
}

class Gadget {
	constructor(engine, owner){
		this.engine = engine;
		this.owner = owner;
		this.coolingDown = false;
		this.cooldownPercent = 0;
		this.cooldown = 5*1000;
		this.cooldownTimer = Date.now() - this.cooldown;
	}
	update(){
		var timeLeft = this.cooldown - (Date.now() - this.cooldownTimer);
		if(timeLeft < 0){
			this.coolingDown = false;
		} else{
			this.cooldownPercent = 0;
			this.coolingDown = true;
		}
		if(this.cooldownPercent < 101){
			this.cooldownPercent = Math.floor((timeLeft/this.cooldown)*100);
		}
	}
	activate(){
		if(this.coolingDown == false){
			this.cooldownTimer = Date.now();
			return true;
		}
	}
	deactivate(){

	}
	reset(){
		this.coolingDown = false;
		this.cooldownPercent = 0;
		this.cooldownTimer = Date.now() - this.cooldown;
	}
}

class DirectionalShield extends Gadget{
	constructor(engine, owner){
		super(engine, owner);
		this.shieldOrbitR = c.forceShieldOrbitR;
		this.shieldHealth = c.forceShieldHealth;
		this.shieldRegenR = c.forceShieldRegenRate;
		this.shieldRadius  = c.forceShieldRadius;

		this.activeShield = null;
		this.cooldown = 5*1000;
		this.duration = 3*1000;
	}
	activate(x,y,angle){
		if(super.activate()){
			this.activeShield = new ForceShield(x,y,this.shieldRadius,this.shieldOrbitR,"blue",this.shieldHealth, this.duration, angle,this.owner);
			return this.activeShield;
		}
	}
	deactivate(x,y){

	}
}

class PulseWave extends Gadget{
	constructor(engine, owner){
		super(engine, owner);
		this.pulseRadius = c.pulseRadius;
		this.duration = 1*1000;
	}
	activate(x,y){
		if(super.activate()){
			var hitCircle = new Pulse(x,y,this.pulseRadius,"orange",this.duration);
			this.engine.explodeObject(x, y, 0, this.pulseRadius,true);
			return hitCircle;
		}
	}
}

class HackingDrone extends Gadget{
	constructor(engine,owner){
		super(engine, owner);
		this.cooldown = c.droneCooldown;
		this.cooldownTimer = Date.now() - this.cooldown;
		this.duration = 200;
	}
	activate(x,y,angle){
		if(super.activate()){
			var drone = new Drone(x,y,c.droneRadius,"orange",this.duration,angle,this.owner);
			return drone;
		}
	}
}

class GadgetObject extends Circle{
	constructor(x,y,radius,color, owner){
		super(x,y,radius,color);
		this.type = "Unset";
		this.alive = true;
		this.angle = 0;
		this.velX = 0;
		this.velY = 0;
		this.newX = this.x;
		this.newY = this.y;
		this.speed = 5;
		this.isStatic = true;
		this.owner = owner;
	}
	update(){
		if(!this.isStatic){
			this.move();
		}
	}
	move(){
		this.x = this.newX;
		this.y = this.newY;
	}
	handleHit(){

	}
}

class ForceShield extends GadgetObject{
	constructor(x,y,radius,orbit,color,health, duration, angle,owner){
		var shieldX = x + (orbit/2) * Math.cos((angle + 90) * Math.PI/180);
		var shieldY = y + (orbit/2) * Math.sin((angle + 90) * Math.PI/180);
		super(shieldX,shieldY,radius,color, owner);
		this.type = "ForceShield";
		this.orbit = orbit;
		this.spawnDate = Date.now();
		this.health = health;
		this.duration = duration;
		this.angle = angle;
		this.isStatic = false;
		this.attached = true;
		this.newX = x;
		this.newY = y;
	}
	update(){
		this.checkLifetime();
		this.x = this.newX + (this.orbit/2) * Math.cos((this.angle + 90) * Math.PI/180);
		this.y = this.newY + (this.orbit/2) * Math.sin((this.angle + 90) * Math.PI/180);
	}

	checkHP(){
		/*
		var timeElapsed = Date.now() - this.regenTimer;
		if (timeElapsed > this.regenTimeout){
			this.regenHealth();
		}
		*/
		if(this.health < 1){
			this.alive = false;
		}
	}
	checkLifetime(){
		if (Date.now() - this.spawnDate > this.duration){
			this.alive = false;
		}
	}

	handleHit(object){
		if(!this.alive){
			return;
		}
		if(object.isNebula){
			return;
		}
		if(object.owner == this.owner){
			return;
		}
		if(object.id == this.owner){
			return;
		}
		if(object.alive && object.damage != null){
			this.takeDamage(object.damage);
		}
	}
	takeDamage(damage){
		/*
		this.regenerating = false;
		this.regenTimer = Date.now();
		*/
		this.health -= Math.abs(damage);
		this.checkHP();
	}
}


class Drone extends GadgetObject{
	constructor(x,y,radius,color,duration,angle,owner){
		super(x,y,radius,color, owner);
		this.type = "Drone";
		this.angle = angle;
		this.isStatic = false;
		this.spawnDate = Date.now();
		this.speed = c.droneFireSpeed;
		this.hackDuration = c.droneHackDuration;
		this.health = 30;
		this.duration = duration;
		this.hacking = false;
		this.searching = false;
		this.stopHacking = false;
		this.hackStarted = null;
		this.targetShip = null;
		this.hasAI = true;
		this.AICreated = false;
		this.AIControlled = false;
		this.hackDirection = utils.getRandomInt(0,6);
	}
	update(){
		super.update();
		if(this.hacking){
			this.x = this.targetShip.x;
			this.y = this.targetShip.y;
			if(this.targetShip.enabled){
				this.targetShip.disable();
				this.targetShip.hacker = this;
				switch(this.hackDirection){
					case 0:{this.targetShip.moveForward = true; break;}
					case 1:{this.targetShip.moveBackward = true; break;}
					case 2:{this.targetShip.turnLeft = true; break;}
					case 3:{this.targetShip.turnRight = true; break;}
					case 4:{this.targetShip.moveForward = true; this.targetShip.turnLeft = true; break;}
					case 5:{this.targetShip.moveForward = true; this.targetShip.turnRight = true; break;}
					case 4:{this.targetShip.moveBackward = true; this.targetShip.turnLeft = true; break;}
					case 6:{this.targetShip.moveBackward = true; this.targetShip.turnRight = true; break;}
				}

			}
			if((this.hackDuration - (Date.now() - this.hackStarted) < 0) || this.stopHacking) {
				this.targetShip.enable();
				this.hacking = false;
				this.targetShip.moveForward = false;
				this.targetShip.moveBackward = false;
				this.targetShip.turnLeft = false;
				this.targetShip.turnRight = false;
				this.alive = false;
			}
			return;
		}
		if(this.duration - (Date.now() - this.spawnDate) < 0){
			if(this.AIControlled == false){
				this.spawnDate = Date.now();
				this.duration = c.dronePauseDuration;
				this.speed = 5;
				this.AIControlled = true;
				this.searching = true;
				return;
			}
			if(this.searching){
				this.spawnDate = Date.now();
				this.duration = c.droneSearchDuration;
				this.speed = c.droneSearchSpeed;
				this.searching = false;
				return;
			}
			if(!this.hacking){
				this.alive = false;
			}
		}
	}
	hack(ship){
		if(this.hacking == false){
			this.targetShip = ship;
			this.hacking = true;
			this.hackStarted = Date.now();
		}
	}
	handleHit(object){
		if(!this.alive){
			return;
		}
		if(this.hacking){
			return;
		}
		if(object.isNebula){
			return;
		}
		if(object.owner == this.owner){
			return;
		}
		if(object.id == this.owner){
			return;
		}
		if(object.damage != null){
			object.health -= object.damage;
			if(object.health < 0){
				this.alive = false;
			}
			return;
		}
		if(object.isShip){
			this.hack(object);
			return;
		}
		this.alive = false;
	}
	checkBreakDisable(){
		if(this.hacking){
			if(utils.getRandomInt(0,c.droneHackStopChance) == 0){
				this.stopHacking = true;
			}
		}
	}
}

class Pulse extends GadgetObject{
	constructor(x,y,radius,color,duration, owner){
		super(x,y,radius,color, owner);
		this.type = "Pulse";
		this.spawnDate = Date.now();
		this.duration = c.pulseDuration;
	}
	update(){
		super.update();
		if(this.duration - (Date.now() - this.spawnDate) < 0){
			this.alive = false;
		}
	}
}




class Asteroid extends Circle{
	constructor(x,y,radius,sig,roomSig){
		super(x,y,radius,"orange");
		this.sig = sig;
		this.isWall = true;
		this.items = [];
		this.roomSig = roomSig;
		this.artType = utils.getRandomInt(0,2);
		this.dropRate = c.asteroidDropRate;
		this.lootTable = c.asteroidLootTable;
		this.spriteAngle = utils.getRandomInt(1,360);
		this.baseHealth = c.asteroidBaseHealth;
		this.health = this.baseHealth;
		this.alive = true;
	}

	update(){

	}
	handleHit(object){
		if(!this.alive){
			return;
		}
		if(object.alive && object.damage != null){
			if(object.owner != null){
				messenger.messageUser(object.owner,"shotAsteroid",this);
			}
			this.health -= object.damage;
			messenger.messageRoomBySig(this.roomSig,'asteroidHurt',{health:this.health,sig:this.sig});
		}
		if(this.health < 1){
			this.checkForDrop();
			this.alive = false;
		}
	}
	checkForDrop(){
		if(utils.getRandomInt(0,10000) <= this.dropRate * 100){
		    var totalSum = 0;
		    var keys = Object.keys(this.lootTable);
	    	for(var item in this.lootTable){
	      		totalSum += this.lootTable[item];
	    	}
			var rand =  utils.getRandomInt(0,totalSum);
      		var sum = 0;
      		var i = 0;
      		while(sum < rand){
        		i += 1;
        		sum += this.lootTable[keys[i]];
      		}
			this.dropItem(keys[Math.max(0,i)]);
		}
	}
	dropItem(itemName){
		switch(itemName){
			case "HealthAttribute":{
				this.items.push(new HealthAttribute(this.x,this.y));
				break;
			}
			case "SpeedAttribute":{
				this.items.push(new SpeedAttribute(this.x,this.y));
				break;
			}
			case "WeaponAttribute":{
				this.items.push(new WeaponAttribute(this.x,this.y));
				break;
			}
			/*
			---Deprecated--
			case "HPItem":{
				item = new HPItem(this.x,this.y);
				break;
			}
			case "ShieldItem": {
				item = new ShieldItem(this.x,this.y);
				break;
			}
			case "OverdriveItem":{
				item = new OverdriveItem(this.x,this.y);
				break;
			}

			case "BlasterItem": {
				item = new BlasterItem(this.x,this.y);
				break;
			}
			case "PhotonCannonItem": {
				item = new PhotonCannonItem(this.x,this.y);
				break;
			}
			case "MassDriverItem": {
				item = new MassDriverItem(this.x,this.y);
				break;
			}
			*/
		}
	}
}

class Planet extends Circle {
	constructor(x,y,radius,sig){
		super(x,y,radius,"SkyBlue");
		this.isWall = true;
		this.artType = utils.getRandomInt(0,1);
		this.sig = sig;
	}
	handleHit(object){
		return;
	}
}

class Nebula extends Circle {
	constructor(x,y,radius,sig){
		super(x,y,radius,"Purple");
		this.isNebula = true;
		this.slowAmt = c.nebulaSlowAmt;
		this.sig = sig;
	}
	handleHit(object){
		return;
	}
}

class TradeShip extends Rect{
	constructor(x,y,width,height, angle, delay, destX, destY,roomSig){
		super(x,y,width,height, angle, "#808080");
		this.delay = delay;
		this.destX = destX;
		this.destY = destY;
		this.speed = c.tradeShipSpeed;
		this.health = 100;
		this.reachedDest = false;
		this.item = MassDriverItem;
		this.readyToMove = false;
		this.alive = true;
		this.sig = null;
		this.roomSig = roomSig;

		this.fireWeapon = false;
		this.stopWeapon = false;
		this.firedBullets = [];

		if(c.tradeShipAIEnabled){
			if(c.tradeShipWeapon == "Blaster"){
				this.weapon = new Blaster(this.sig);
			}
			if(c.tradeShipWeapon == "PhotonCannon"){
				this.weapon = new PhotonCannon(this.sig);
			}
			if(c.tradeShipWeapon == "MassDriver"){
				this.weapon = new MassDriver(this.sig);
			}
			this.weapon.level = c.tradeShipWeaponLevel;
		}


		this.trailSpawnTime = 1;
		this.lastTrailSpawn = new Date();
		this.trailList = {};
		setTimeout(this.startMove,this.delay*1000,this);
	}
	update(){
		if(this.readyToMove){
			if(!this.reachedDest){
				this.drawTrail();
				this.move();
				this.updateTrails();
				this.checkFireState();
			} else{
				this.alive = false;
			}
		}
	}
	updateTrails(){
		for(var sig in this.trailList){
			if(this.trailList[sig].alive){
				this.trailList[sig].update();
			}else{
				delete this.trailList[sig];
			}

		}
	}
	fire(){
		var bullets = this.weapon.fire(this.x, this.y, this.weapon.angle, '#808080',this.sig);
		if(bullets == null){
			return;
		}
		for(var i=0;i<bullets.length;i++){
			this.firedBullets.push(bullets[i]);
		}
		var data = compressor.weaponFired(this,this.weapon,bullets);
		messenger.messageRoomBySig(this.roomSig,'weaponFired',data);
	}
	startMove(ts){
		ts.readyToMove = true;
	}
	dropItems(){
		var item = new this.item(this.x+this.width/2,this.y+this.height/2,1);
		return [item];
	}
	move(){
		this.x += this.speed * Math.cos(this.angle * (Math.PI/180));
		this.y += this.speed * Math.sin(this.angle * (Math.PI/180));
		this.vertices = this.getVertices();
		var dist2 = utils.getMagSq(this.x,this.y,this.destX,this.destY);
		if(dist2 < 10000){
			this.reachedDest = true;
		}
	}
	drawTrail(){
		var currentTime = new Date();
		if(currentTime - this.lastTrailSpawn > this.trailSpawnTime*1000){
			var sig = this.generateTrailSig();
			this.trailList[sig] = new Trail(this.x,this.y);
			this.lastTrailSpawn = currentTime;
		}
	}
	generateTrailSig(){
		var sig = utils.getRandomInt(0,99999);
		if(this.trailList[sig] == null || this.trailList[sig] == undefined){
			return sig;
		}
		return this.generateTrailSig();
	}
	checkFireState(){
		if(this.fireWeapon){
			this.fire();
		}
		if(this.stopWeapon){
			this.stopFire();
		}
	}

	handleHit(object){
		if(object.alive && object.damage != null){
			if(object.owner == this.sig){
				return;
			}
			this.health -= object.damage;
			messenger.messageUser(object.owner,"shotLanded",{id:this.sig,damage:object.damage,crit:(object.isCrit == true)});
			if(this.health < 1){
				messenger.toastPlayer(object.owner,"You killed a TradeShip!");
				this.alive = false;
			}
		}
	}
}

class Trail extends Circle {
	constructor(x,y){
		super(x,y,5,"rgba(176,196,222,1)");
		this.lifetime = c.tradeShipTrailDuration*1000;
		this.start = new Date();
		this.alive = true;
		this.alpha = 1;
	}
	update(){
		var currentTime = new Date();
		var remaining = this.lifetime - (currentTime - this.start);
		if(remaining <= 0){
			this.alive = false;
			return;
		}
		this.alpha = remaining/this.lifetime;
		this.radius += 1;
		var newRGBA = this.color.substring(5,this.color.length-1).replace('/ /g','').split(',');
		var colorString = "rgba(";
		for(var i=0;i<newRGBA.length-1;i++){
			colorString += newRGBA[i] + ',';
		}
		this.color = colorString + this.alpha.toFixed(2) +')';
	}

}

class CircleItem extends Circle{
	constructor(x,y,color){
		super(x,y,c.baseItemRadius,color);
		this.isItem = true;
		this.shouldMove = true;
		this.itemDecayRate = utils.getRandomInt(c.itemMinDecayRate,c.itemMaxDecayRate)*1000;
		this.dropDate = Date.now();
		this.sig = null;
		this.alive = true;
		this.speed = c.itemBaseSpeed;
		this.dragCoeff = c.itemDragCoeff;
		this.velY = 0;
		this.velX = 0;
		this.maxVelocity = c.playerMaxSpeed;
		this.newX = this.x;
		this.newY = this.y;
		this.angle = 180;
		this.dt = 0;
	}
	update(dt){
		this.dt = dt;
		if(this.itemDecayRate != null){
			if(Date.now()-this.dropDate > this.itemDecayRate){
				this.alive = false;
			}
		}
		if(this.shouldMove){
			this.move();
		}
	}
	move(){
		this.x = this.newX;
		this.y = this.newY;
	}
	handleHit(object){
		if(!this.alive){
			return false;
		}
		if(object.isWall){
			_engine.preventMovement(this,object,this.dt);
			return false;
		}
	}
}
/*

---Deprecated---

class HPItem extends CircleItem {
	constructor(x,y){
		super(x,y,"Red");
		this.healAmt = 15;
		this.itemDecayRate = null;
		this.equipMessage = "Applied health pack +" + this.healAmt;
		this.name = 'HPItem';
	}
	handleHit(object){
		if(!this.alive){
			return;
		}
		if(object instanceof Ship){
			object.heal(this.healAmt);
			this.alive = false;
		}
	}
}
*/


class Boost extends CircleItem {
	constructor(x,y){
		super(x,y,"Red");
		this.boostAmt = 1000;
		this.duration = 10;
		this.boostMessage = "Unset";
		this.refreshMessage = "Unset";
		this.exitMessage = "Unset";
		this.type = 'Unset';
		this.name = 'Unset';
	}
	handleHit(object){
		if(super.handleHit(object) == false){
			return;
		}
		if(object instanceof Ship){
			object.applyBoost(this.type,this.boostAmt,this.duration,this.boostMessage,this.exitMessage,this.refreshMessage);
			this.alive = false;
		}
	}
}

class OverdriveItem extends Boost{
	constructor(x,y){
		super(x,y);
		this.boostAmt = 200;
		this.duration = 15;
		this.boostMessage = "Engaged Overdrive";
		this.refreshMessage = "Overdrive extended";
		this.exitMessage = "Overdrive expired";
		this.type = 'speed';
		this.name = 'OverdriveItem';
	}
}


class EquipableItem extends CircleItem{
	constructor(x,y,color,level){
		super(x,y,color);
		this.pickUpCooldown = 0;
		this.level = level || 1;
		this.name = '';
	}
	handleHit(object){
		if(super.handleHit(object) == false){
			return;
		}
		if(object instanceof Ship){
			if(Date.now()-this.dropDate < this.pickUpCooldown*1000){
				return;
			}
			object.equip(this);
			this.alive = false;
		}
	}
}

class AttributeItem extends EquipableItem{
	constructor(x,y){
		super(x,y,"Blue",1);
		this.name = 'base';
	}
}

class HealthAttribute extends AttributeItem {
	constructor(x,y, angle, velX, velY, speed){
		super(x,y);
		this.name = "HealthAttribute";
		this.angle = angle || 0;
		this.speed = speed || 0;
		this.velX = velX + Math.cos(this.angle*(Math.PI/180))*this.speed || 0;
		this.velY = velY + Math.sin(this.angle*(Math.PI/180))*this.speed || 0;
	}
}

class SpeedAttribute extends AttributeItem {
	constructor(x,y, angle, velX, velY, speed){
		super(x,y);
		this.name = "SpeedAttribute";
		this.angle = angle || 0;
		this.speed = speed || 0;
		this.velX = velX + Math.cos(this.angle*(Math.PI/180))*this.speed || 0;
		this.velY = velY + Math.sin(this.angle*(Math.PI/180))*this.speed || 0;
	}
}
class WeaponAttribute extends AttributeItem {
	constructor(x,y, angle, velX, velY, speed){
		super(x,y);
		this.name = "WeaponAttribute";
		this.angle = angle || 0;
		this.speed = speed || 0;
		this.velX = velX + Math.cos(this.angle*(Math.PI/180))*this.speed || 0;
		this.velY = velY + Math.sin(this.angle*(Math.PI/180))*this.speed || 0;
	}
}

class BlasterItem extends EquipableItem {
	constructor(x,y,level){
		super(x,y,"Magenta",level);
		this.name = 'BlasterItem';
	}
}

class PhotonCannonItem extends EquipableItem {
	constructor(x,y,level){
		super(x,y,"Yellow",level);
		this.name = 'PhotonCannonItem';
	}
}
class MassDriverItem extends EquipableItem {
	constructor(x,y,level){
		super(x,y,"Green",level);
		this.name = 'MassDriverItem';
	}
}
class ShieldItem extends EquipableItem {
	constructor(x,y){
		super(x,y,"Aqua");
		this.name = 'ShieldItem';
	}
}

class Weapon {
	constructor(owner){
		this.name = "Unset";
		this.owner = owner;
		this.cooldown = .2;
		this.level = 1;
		this.maxLevel = 3;
		this.nextFire = 0;
		this.powerCost = 20;
		this.angle = 0;
		this.maxLevelMessage = "Weapon already at max";
		this.upgradeMessage = "No upgrade message set";
		this.equipMessage = "No equip message set";
		this.critChance = 5;
		this.critIncreasePercent = 10;
	}
	equip(){
		messenger.toastPlayer(this.owner,this.equipMessage);
	}
	resetCoolDown(){
		this.nextFire = 0;
	}
	onCoolDown(){
		this.currentTime = new Date();
		if(this.currentTime > this.nextFire){
			this.nextFire = new Date(this.currentTime);
			this.nextFire.setTime(this.nextFire.getTime() + this.cooldown*1000);
			return false;
		}
		return true;
	}
	upgrade(){
		if(this.level < this.maxLevel){
			messenger.toastPlayer(this.owner,this.upgradeMessage);
			this.level++;
			return;
		}
		messenger.toastPlayer(this.owner,this.maxLevelMessage);
	}
	drop(x,y,level){
		var item = new this.item(x,y,level);
		item.pickUpCooldown = 1.5;
		return item;
	}
	calculateCritBonusDamage(bullet,critChanceBonus){
		var roll = utils.getRandomInt(1,100);
		if(roll <=  (100-this.critChance) - critChanceBonus){
			return 0;
		}
		bullet.isCrit = true;
		return bullet.damage*(this.critIncreasePercent/100);
	}
}

class Blaster extends Weapon{
	constructor(owner,level){
		super(owner);
		this.level = level;
		this.name = "Blaster";
		this.powerCost = c.blasterPowerCost;
		this.equipMessage = "Equiped Blaster";
		this.upgradeMessage ="Upgraded Blaster";
		this.item = BlasterItem;
		this.bulletWidth = 5;
		this.bulletHeight = 12;
		this.critChance = c.blasterCritChance;
		this.critIncreasePercent = c.blasterCritIncreasePercent;
	}

	fire(x,y,angle,color,id,critBonus){
		if(this.onCoolDown()){
			return;
		}
		var bullets = [];
		var sprayAngle = utils.getRandomInt(-5,5);
		var bull1 = new Bullet(x,y,this.bulletWidth,this.bulletHeight, angle + sprayAngle, color, id);
		bull1.damage += this.calculateCritBonusDamage(bull1,critBonus);
		bullets.push(bull1);
		return bullets;
	}
	upgrade(){
		super.upgrade();
		if(this.level == 3){
			this.cooldown = c.blasterCoolDown - .3;
		}
	}
}

class ParticleBeam extends Weapon{
	constructor(owner){
		super(owner);
		this.name = "ParticleBeam";
		this.equipMessage = "Equiped Particle Beam";
		this.powerCost = 0;
		this.chargeCost = c.particleBeamChargeCost;
		this.damagePerCharge = c.particleBeamDamageGrowthRate;
		this.chargeTime = c.particleBeamChargeTime;
		this.chargeTimer = Date.now() - this.chargeTime;
		this.chargeLevel = 0;
		this.currentBeam = null;
		this.critChance = c.particleBeamCritChance;
		this.critChanceBonus = c.particleBeamCritIncreasePercent;
	}
	fire(x,y,angle,color,id,powerLevel,critBonus){
		if(this.checkForCharge(powerLevel)){
			this.charge();
		}
		this.powerCost = c.particleBeamBasePowerCost;
		if(this.chargeLevel > 0){
			if(this.currentBeam == null){
				this.currentBeam = new Beam(x,y,c.particleBeamWidth,c.particleBeamHeight,angle,color,id);
				this.powerCost += c.particleBeamChargeCost * this.chargeLevel;
			} else{
				this.powerCost = c.particleBeamChargeCost * this.chargeLevel;
			}
			if (this.currentBeam.isColliding){
				this.currentBeam.height = this.currentBeam.collisionDistance;
				this.currentBeam.vertices = this.currentBeam.getVertices();
			}
			else{
				this.currentBeam.height = c.particleBeamHeight;
			}

			this.currentBeam.width = c.particleBeamWidth + ((this.chargeLevel-1)*c.particleBeamWidthGrowthPerCharge);
			this.currentBeam.damage = c.particleBeamBaseDamage + (this.damagePerCharge * this.chargeLevel);
			this.currentBeam.damage += this.calculateCritBonusDamage(this.currentBeam,critBonus);
			this.currentBeam.angle = angle;
			this.currentBeam.vertices = this.currentBeam.getVertices();
			this.currentBeam.x = x + (this.currentBeam.height/2) * Math.cos((this.angle+90) * Math.PI/180);
			this.currentBeam.y = y + (this.currentBeam.height/2) * Math.sin((this.angle+90) * Math.PI/180);


			this.currentBeam.isColliding = false;
			return [this.currentBeam];
		}

	}
	stopFire(){
		this.chargeLevel = 0;
		messenger.messageUser(this.owner,'weaponCharge',this.chargeLevel);
		if(this.currentBeam != null){
			this.currentBeam.alive = false;
			this.currentBeam = null;
		}
	}

	checkForCharge(powerLevel){
		if(this.chargeTime - (Date.now() - this.chargeTimer) < 0){
			var currentCost;
			if(this.chargeLevel == 1){
				currentCost = c.particleBeamBasePowerCost;
			} else{
				currentCost = this.chargeCost*this.chargeLevel;
			}

			if(currentCost > powerLevel){
				this.discharge();
				return false;
			}
			this.chargeTimer = Date.now();
			return true;
		}
		return false;
	}

	charge(){
		if(this.chargeLevel < 5){
			this.chargeLevel++;
			messenger.messageUser(this.owner,'weaponCharge',this.chargeLevel);
		}
	}
	discharge(){
		if(this.chargeLevel > 0){
			this.chargeLevel--;
			messenger.messageUser(this.owner,'weaponCharge',this.chargeLevel);
		}

	}

}


class PhotonCannon extends Weapon{
	constructor(owner,level){
		super(owner);
		this.level = level;
		this.name = "PhotonCannon";
		this.equipMessage = "Equiped Photon Cannon";
		this.upgradeMessage ="Upgraded Photon Cannon";
		this.item = PhotonCannonItem;
		this.reset = false;
		this.powerCost = c.photonCannonPowerCost;
		this.chargeCost = c.photonCannonChargeCost;
		this.chargeTime = c.photonCannonChargeTime;
		this.chargeTimer = Date.now() - this.chargeTime;
		this.chargeLevel = 0;
		this.critChance = c.photonCannonCritChance;
		this.critIncreasePercent = c.photonCannonCritIncreasePercent;
	}
	fire(x,y,angle,color,id,powerLevel,critBonus){
		if(this.reset){
			this.powerCost = c.photonCannonPowerCost;
			this.chargeLevel = 0;
			this.reset = false;
		}
		if(this.checkForCharge(powerLevel)){
			this.charge();
		}
	}
	stopFire(x,y,angle,color,id,critBonus){
		var _bullets = [], powerCost;
		powerCost = c.photonCannonPowerCost;
		var bullet1 = new Birdshot(x,y,4,10, angle, color, id);
		bullet1.damage += this.calculateCritBonusDamage(bullet1,critBonus);
		_bullets.push(bullet1);
		if(this.chargeLevel >= 2){
			var bullet2 = new Birdshot(x,y,4,10, angle-5, color, id);
			var bullet3 = new Birdshot(x,y,4,10, angle+5, color, id);
			bullet2.damage += this.calculateCritBonusDamage(bullet2,critBonus);
			bullet3.damage += this.calculateCritBonusDamage(bullet3,critBonus);
			_bullets.push(bullet2);
			_bullets.push(bullet3);
			powerCost += this.chargeCost;
		}
		if(this.chargeLevel == 3){
			var bullet4 = new Birdshot(x,y,4,10,angle-10, color,id);
			var bullet5 = new Birdshot(x,y,4,10, angle+10, color,id);
			bullet4.damage += this.calculateCritBonusDamage(bullet4,critBonus);
			bullet5.damage += this.calculateCritBonusDamage(bullet5,critBonus);
			_bullets.push(bullet4);
			_bullets.push(bullet5);
			powerCost += this.chargeCost;
		}
		this.powerCost = powerCost;
		this.reset = true;
		messenger.messageUser(this.owner,'weaponCharge',0);
		return _bullets;
	}
	checkForCharge(powerLevel){
		if(this.chargeTime - (Date.now() - this.chargeTimer) < 0){
			var currentCost = c.photonCannonPowerCost;
			if(this.chargeLevel >= 1){
				currentCost += this.chargeCost*this.chargeLevel;
			}
			if(currentCost > powerLevel){
				return false;
			}
			this.chargeTimer = Date.now();
			return true;
		}
		return false;
	}

	charge(){
		if(this.chargeLevel < 3){
			this.chargeLevel++;
			messenger.messageUser(this.owner,'weaponCharge',this.chargeLevel);
		}
	}

	upgrade(){
		super.upgrade();
		if(this.level == 3){
			this.cooldown = c.photonCannonCoolDown - .3;
		}
	}
}

class MassDriver extends Weapon{
	constructor(owner,level){
		super(owner);
		this.name = "MassDriver";
		this.powerCost = c.massDriverPowerCost;
		this.level = level;
		this.equipMessage = "Equiped Mass Driver";
		this.upgradeMessage = "Upgraded Mass Driver";
		this.threeShot = false;
		this.item = MassDriverItem;
		this.critChance = c.massDriverCritChance;
		this.critIncreasePercent = c.massDriverCritIncreasePercent;
	}
	fire(x,y,angle,color,id,critBonus){
		if(this.onCoolDown()){
			return;
		}
		var bullets = [];
		var bullet = new MassDriverBullet(x,y,8,20, angle, color, id);
		if(this.level > 1){
			bullet.speed += bullet.speed * .35;
		}
		bullet.damage += this.calculateCritBonusDamage(bullet,critBonus);
		bullets.push(bullet);
		return bullets;
	}
	upgrade(){
		super.upgrade();
		if(this.level == 3){
			this.cooldown = c.massDriverCoolDown - .7;
		}
	}
}

class Shield extends Circle{
	constructor(owner){
		super(0,0,c.shieldRadius,c.shield1Color);
		this.name = 'Shield';
		this.level = 1;
		this.maxLevel = 3;
		this.equipMessage = "Equiped Shield";
		this.upgradeMessage = "Upgraded Shield";
		this.maxLevelMessage = "Shield restored 10 points";
		this.health = c.shield1Protection;
		this.maxHealth = c.shield3Protection;
		this.restoreAmount = c.shieldRestoreAmount;
		this.owner = owner;
		this.alive = true;
	}
	handleHit(object){
		if(!this.alive){
			return;
		}
		this.health -= object.damage;
		if(this.health < 1){
			this.leftOverDamage = this.health;
			this.alive = false;
			return;
		}
		this.checkLevel();
	}
	upgrade(){
		if(!this.alive){
			return;
		}
		if(this.level < this.maxLevel){
			this.health += this.restoreAmount;
			this.checkLevel();
			messenger.toastPlayer(this.owner,this.upgradeMessage);
			return;
		}
		if(this.health < this.maxHealth){
			if(this.health + this.restoreAmount < this.maxHealth){
				this.health + this.restoreAmount;
			} else{
				this.health = this.maxHealth;
			}
		}
		messenger.toastPlayer(this.owner,this.maxLevelMessage);
	}
	checkLevel(){
		if(this.health >= 1 && this.health <= c.shield1Protection){
			this.level = 1;
			return;
		}
		if(this.health > c.shield1Protection && this.health <= c.shield2Protection){
			this.level = 2;
			return;
		}
		if(this.health > c.shield2Protection && this.health <= c.shield3Protection){
			this.level = 3;
		}
	}
	equip(){
		messenger.toastPlayer(this.owner,this.equipMessage);
	}
}



class Bullet extends Rect{
	constructor(x,y,width,height, angle, color, owner){
		super(x,y,width,height, angle, color);
		this.alive = true;
		this.owner = owner;
		this.sig = null;
		this.isBullet = true;
		this.lifetime = c.bulletLifetime;
		this.damage = c.blasterBulletDamage;
		this.speed = c.blasterBulletSpeed;
		this.isCrit = false;
		this.velX = 0;
		this.velY = 0;
		this.newX = this.x;
		this.newY = this.y;
	}
	update(){
		this.move();
	}
	move(){
		this.x = this.newX;
		this.y = this.newY;
	}
	handleHit(object){
		if(!this.alive){
			return;
		}
		if(object.isBullet){
			return;
		}
		if(object.owner == this.owner){
			return;
		}
		if(object.id == this.owner){
			return;
		}
		if(object.sig == this.owner){
			return;
		}
		if(object.isNebula){
			return;
		}
		if(object.isItem){
			return;
		}
		return true;
	}
	killSelf(){
		this.alive = false;
	}
}

class Beam extends Bullet{
	constructor(x,y,width,height, angle, color, owner){
		super(x,y,width,height, angle, color, owner);
		this.isBeam = true;
		this.damage = c.particleBeamBaseDamage;
		this.isColliding = false;
		this.collisionDistance = null;
		this.hitList = [];
	}
	move(){

	}
	handleHit(object){
		if(!this.alive){
			return;
		}
		if(object.isBullet){
			return;
		}
		if(object.owner == this.owner){
			return;
		}
		if(object.id == this.owner){
			return;
		}
		if(object.sig == this.owner){
			return;
		}
		if(object.isNebula){
			return;
		}
		if(object.isItem){
			return;
		}
		return true;
	}

}

class Birdshot extends Bullet{
	constructor(x,y,width,height, angle, color, owner){
		super(x,y,width,height, angle, color, owner);
		this.damage = c.birdshotDamage;
		this.speed = c.birdshotSpeed;
		this.lifetime = c.birdshotLifetime;
	}

}

class MassDriverBullet extends Bullet{
	constructor(x,y,width,height, angle, color, owner){
		super(x,y,width,height,angle, color, owner);
		this.damage = c.massDriverBulletDamage;
		this.speed = c.massDriverBulletSpeed;
	}
}
