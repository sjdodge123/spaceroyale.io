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
		this.killedShips = {};
		this.clientCount = 0;
		this.alive = true;
		this.engine = _engine.getEngine(this.bulletList, this.shipList, this.world, this.asteroidList, this.planetList,this.nebulaList,this.tradeShipList);
		this.world = new World(0,0,c.lobbyWidth,c.lobbyHeight,this.engine,this.sig);
		this.game = new Game(this.world,this.clientList,this.bulletList,this.shipList,this.asteroidList,this.planetList,this.itemList,this.nebulaList,this.tradeShipList,this.engine,this.AIList,this.sig);
	}
	join(clientID){
		var client = messenger.getClient(clientID);
		messenger.addRoomToMailBox(clientID,this.sig);
		client.join(this.sig);
		this.clientCount++;
	}
	leave(clientID){
		console.log(this.clientList[clientID] + ' left Room' + this.sig);
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
				this.game.gameBoard.spawnItem(ship.weapon.drop(ship.x,ship.y));
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
				messenger.messageRoomBySig(this.sig,'shipDeath',shipID);
			}
		}
	}

	sendUpdates(){
		messenger.messageRoomBySig(this.sig,"gameUpdates",{
			shipList:this.shipList,
			planetList:this.planetList,
			itemList:this.itemList,
			nebulaList:this.nebulaList,
			tradeShipList:this.tradeShipList,
			world:this.world,
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
	constructor(world,clientList,bulletList,shipList,asteroidList,planetList,itemList,nebulaList,tradeShipList,engine,AIList,roomSig){
		this.world = world;
		this.clientList = clientList;
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.planetList = planetList;
		this.asteroidList = asteroidList;
		this.itemList = itemList;
		this.nebulaList = nebulaList;
		this.tradeShipList = tradeShipList;
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

		this.gameBoard = new GameBoard(world,clientList,bulletList,shipList,asteroidList,planetList,itemList,nebulaList,this.tradeShipList,this.AIList,engine,this.roomSig);
	}

	start(){
		messenger.messageRoomBySig(this.roomSig,'gameStart',null);
		this.gameBoard.clean();
		this.active = true;
		this.world.resize();
		this.gameBoard.populateWorld();
		this.checkForAISpawn();
		this.randomLocShips();
		this.world.drawFirstBound();
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
		console.log("Room" + this.roomSig +"'s game has ended.");
		for(var shipID in this.shipList){
			if(!this.shipList[shipID].isAI){
				console.log(this.clientList[shipID]+" wins!");
				this.winner = shipID;
			}
		}
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
		if(this.getPlayerShipCount() >= this.minPlayers){
			if(this.lobbyTimer == null){
				var game = this;
				this.lobbyTimer = utils.getTimer(function(){game.start();},this.lobbyWaitTime*1000);
			} else{
				this.lobbyTimeLeft = this.lobbyTimer.getTimeLeft().toFixed(1);
			}
		} else{
			this.cancelGameStart();
		}
	}
	checkForAISpawn(){
		var spawnAmt = c.maxPlayersInRoom - this.getPlayerShipCount()
		if(c.AISpawnPlayers){
			for(var i=0;i<spawnAmt;i++){
				this.shipList[i] = this.world.spawnNewShip(i,"orange");
				this.AIList[i] = AI.setAIController(this.shipList[i],this.world,this.gameBoard);
			}
		}
	}
	updateAI(active){
		for(var sig in this.AIList){
			this.AIList[sig].update(active);
		}
	}
	cancelGameStart(){
		if(this.lobbyTimer != null){
			this.lobbyTimer.reset();
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
		return shipCount;
	}
	randomLocShips(){
		if(c.randomizePlayersLocations){
			for(var shipID in this.shipList){
				var ship = this.shipList[shipID];
				var loc = this.world.findFreeLoc(ship,0);
				ship.newX = loc.x;
				ship.newY = loc.y;
			}
		}
	}
}

class GameBoard {
	constructor(world,clientList,bulletList,shipList,asteroidList,planetList,itemList,nebulaList,tradeShipList,AIList,engine,roomSig){
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
		this.engine = engine;
		this.roomSig = roomSig;
	}
	update(active, dt){
		this.engine.update(dt);
		this.checkCollisions(active);
		this.updateShips(active,dt);
		this.updateTradeShips();
		this.updateBullets(dt);
		this.updateAsteroids();
		this.updateItems();
	}
	updateShips(active,dt){
		for(var shipID in this.shipList){
			var ship = this.shipList[shipID];
			if(active){
				this.world.checkForMapDamage(ship);
			}
			if(ship.droppedItem != null){
				this.spawnItem(ship.droppedItem);
				ship.droppedItem = null;
			}
			ship.update(dt);
		}
	}
	updateTradeShips(){
		for(var sig in this.tradeShipList){
			var tradeShip = this.tradeShipList[sig];
			if(tradeShip.alive == false){
				this.spawnItem(tradeShip.dropItem());
				delete this.tradeShipList[sig];
				continue;
			}
			tradeShip.update();
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
			messenger.messageRoomBySig(this.roomSig,'terminateAsteroid',deadSigs);
		}
	}
	updateItems(){
		for(var itemSig in this.itemList){
			var item = this.itemList[itemSig];
			if(item.alive == false){
				this.terminateItem(itemSig);
			}
		}
	}
	spawnItem(item){
		var sig = this.generateItemSig();
		item.sig = sig;
		this.itemList[sig] = item;
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
			for(var sig in this.bulletList){
				objectArray.push(this.bulletList[sig]);
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
	fireWeapon(ship){
		var bullets = ship.fire();
		if(bullets == null){
			return;
		}
		for(var i=0;i<bullets.length;i++){
			var bullet = bullets[i];
			bullet.sig = this.generateBulletSig();
			this.bulletList[bullet.sig] = bullet;
			setTimeout(this.terminateBullet,bullet.lifetime*1000,{sig:bullet.sig,bulletList:this.bulletList});
		}
		var data = compressor.weaponFired(ship,ship.weapon,bullets);
		messenger.messageRoomBySig(this.roomSig,'weaponFired',data);
	}
	terminateBullet(packet){
		if(packet.bulletList[packet.sig] != undefined){
			packet.bulletList[packet.sig].alive = false;;
		}
	}
	terminateAsteroid(asteroid){
		if(asteroid.item != null){
			this.spawnItem(asteroid.item);
		}
		delete this.asteroidList[asteroid.sig];
	}
	terminateItem(itemSig){
		delete this.itemList[itemSig];
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
				var loc = this.world.findFreeLoc(asteroid,0);
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
				var loc = this.world.findFreeLoc(planet,0);
				planet.x = loc.x;
				planet.y = loc.y;
				this.planetList[sig] = planet;
			}
		}
		if(c.generateNebulas){
			for(var i = 0; i<c.nebulaAmt;i++){
				var sig = this.generateNebulaSig();
				var nebula = new Nebula(0,0,utils.getRandomInt(c.nebulaMinSize,c.nebulaMaxSize),sig);
				var loc = this.world.findFreeLoc(nebula,0);
				nebula.x = loc.x;
				nebula.y = loc.y;
				this.nebulaList[sig] = nebula;
			}
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
	}

	drawNextBound(){
		this.whiteBound = this._drawWhiteBound();
		this.canSpawnTradeShip = true;
	}
	drawFirstBound(){
		var newRadius = this.blueBound.radius/3;
		var x = utils.getRandomInt(this.x+newRadius,this.x+this.width-newRadius);
		var y = utils.getRandomInt(this.y+newRadius,this.y+this.height-newRadius);
		this.whiteBound = new WhiteBound(x,y,newRadius);
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
		var objW = size + c.playerBaseRadius*2;
		var objH = size + c.playerBaseRadius*2;
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
			packet.object.health -= packet.damage;
			setTimeout(packet.callback,packet.rate*1000,packet);
		}
	}

	spawnNewShip(id,color){
		var ship = new Ship(0,0, 90, color, id,this.roomSig);
		var loc = this.findFreeLoc(ship,0);
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
	constructor(x,y, angle, color, id, roomSig){
		super(x, y, c.playerBaseRadius, color);
		this.baseHealth = c.playerBaseHealth;
		this.health = this.baseHealth;
		this.baseColor = color;
		this.glowColor = color;
		this.angle = angle;
		this.spriteAngle = 0;
		this.rotationRate = 1;
		this.isHit = false;
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
		this.velocity = 0;
		this.velX = 0;
		this.velY = 0;
		this.droppedItem = null;
		this.dt = 0;
		this.roomSig = roomSig;
		this.explosionRadius = c.playerExplosionRadius;
		this.explosionMaxDamage = c.playerExplosionMaxDamage;

		if(c.playerSpawnWeapon == "Blaster"){
			this.weapon = new Blaster(this.id);
		}
		if(c.playerSpawnWeapon == "PhotonCannon"){
			this.weapon = new PhotonCannon(this.id);
		}
		if(c.playerSpawnWeapon == "MassDriver"){
			this.weapon = new MassDriver(this.id);
		}

		this.weapon.level = c.playerSpawnWeaponLevel;
	}
	update(dt){
		this.dt = dt;
		if (this.spriteAngle < 359){
			this.spriteAngle += this.rotationRate;
		}
		else{
			this.spriteAngle = 0;
		}
		this.weapon.angle = this.angle;
		this.checkHP();
		this.checkKills();
		this.move();
	}
	equip(item){
		if(item instanceof ShieldItem){
			if(this.shield == null){
				this.shield = new Shield(this.id);
				this.shield.equip();
				return;
			}
			if(this.shield instanceof Shield){
				this.shield.upgrade();
				return;
			}
		}
		if(item instanceof BlasterItem){
			if(this.weapon instanceof Blaster){
				this.weapon.upgrade();
				return;
			}
			this.droppedItem = this.weapon.drop(this.x,this.y,this.weapon.level);
			this.weapon = new Blaster(this.id,item.level);
			this.weapon.equip();
			return;
		}
		if(item instanceof PhotonCannonItem){
			if(this.weapon instanceof PhotonCannon){
				this.weapon.upgrade();
				return;
			}
			this.droppedItem = this.weapon.drop(this.x,this.y,this.weapon.level);
			this.weapon = new PhotonCannon(this.id,item.level);
			this.weapon.equip();
			return;
		}
		if(item instanceof MassDriverItem){
			if(this.weapon instanceof MassDriver){
				this.weapon.upgrade();
				return;
			}
			this.droppedItem = this.weapon.drop(this.x,this.y,this.weapon.level);
			this.weapon = new MassDriver(this.id,item.level);
			this.weapon.equip();
			return;
		}

	}
	heal(amt){
		if(this.health < this.baseHealth){
			if(this.health+amt > this.baseHealth){
				this.health = this.baseHealth;
			} else{
				this.health += amt;
			}
			messenger.toastPlayer(this.id,"Healed " + amt);
		} else{
			messenger.toastPlayer(this.id,"Full health");
		}
	}
	fire(){
		var x = this.x + this.radius * Math.cos((this.angle + 90) * Math.PI/180);
		var y = this.y + this.radius * Math.sin((this.angle + 90) * Math.PI/180);
		var _bullets = this.weapon.fire(x,y,this.angle, this.baseColor,this.id);
		if(_bullets == null){
			return;
		}
		return _bullets;
	}
	move(){
		if(this.newX != this.x || this.newY != this.y){
			this.x = this.newX;
			this.y = this.newY;
			if(this.isHiding){
				this.isHiding = false;
			}
		}
	}
	handleHit(object){
		if(object.isWall){
			messenger.messageUser(this.id,"collideWithObject");
			_engine.preventMovement(this,object,this.dt);
		}
		if(object.isNebula){
			this.isHiding = true;
			_engine.slowDown(this,this.dt,object.slowAmt);
			return;
		}
		if(object.owner != this.id && object.alive && object.damage != null){
			messenger.messageUser(object.owner,"shotLanded");
			if(this.shield != null && this.shield.alive){
				this.shield.handleHit(object);
				if(this.shield.alive){
					return;
				}
				this.health -= Math.abs(this.shield.leftOverDamage);
				this.shield = null;
			} else{
				this.health -= object.damage;
			}

			if(this.health < 1){
				this.iDied(object.owner);
			}
		}
	}

	takeDamage(damage){
		this.health -= Math.floor(damage);
		this.checkHP();
	}
	iDied(killerID){
		if(killerID){
			this.killedBy = killerID;
		}


		this.alive = false;

	}
	checkHP(){
		if(this.health < 1){
			this.alive = false;
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
}


class Asteroid extends Circle{
	constructor(x,y,radius,sig,roomSig){
		super(x,y,radius,"orange");
		this.sig = sig;
		this.isWall = true;
		this.item = null;
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
		var item;
		switch(itemName){
			case "HPItem":{
				item = new HPItem(this.x,this.y);
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
			case "ShieldItem": {
				item = new ShieldItem(this.x,this.y);
				break;
			}
		}
		this.item = item;
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
		if(bullets != null){
			messenger.messageRoomBySig(this.roomSig,'weaponFired',{ship:this,weapon:this.weapon});
		}
		return bullets;
	}
	startMove(ts){
		ts.readyToMove = true;
	}
	dropItem(){
		var item = new this.item(this.x+this.width/2,this.y+this.height/2,1);
		return item;
	}
	move(){
		this.x += this.speed * Math.cos(this.angle * (Math.PI/180));
		this.y += this.speed * Math.sin(this.angle * (Math.PI/180));
		this.vertices = this.getVertices();
		if(this.x == this.destX && this.destY == this.destY){
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

	handleHit(object){
		if(object.alive && object.damage != null){
			if(object.owner == this.sig){
				return;
			}
			this.health -= object.damage;
			if(this.health < 1){
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
		super(x,y,25,color);
		this.isItem = true;
		this.sig = null;
		this.alive = true;
	}
}

class HPItem extends CircleItem {
	constructor(x,y){
		super(x,y,"Red");
		this.healAmt = 15;
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

class EquipableItem extends CircleItem{
	constructor(x,y,color,level){
		super(x,y,color);
		this.dropDate = null;
		this.pickUpCooldown = 1;
		this.level = level || 1;
		this.name = '';
	}
	handleHit(object){
		if(!this.alive){
			return;
		}
		if(this.dropDate != null && new Date()-this.dropDate < this.pickUpCooldown*1000){
			return;
		}
		if(object instanceof Ship){
			object.equip(this);
			this.alive = false;
		}
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
		this.cooldown = 10;
		this.level = 1;
		this.maxLevel = 3;
		this.nextFire = 0;
		this.maxLevelMessage = "Weapon already at max";
		this.upgradeMessage = "No upgrade message set";
		this.equipMessage = "No equip message set";
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
		item.dropDate = new Date();
		return item;
	}
}

class Blaster extends Weapon{
	constructor(owner,level){
		super(owner);
		this.level = level;
		this.name = "Blaster";
		this.cooldown = c.blasterCoolDown;
		this.equipMessage = "Equiped Blaster";
		this.upgradeMessage ="Upgraded Blaster";
		this.item = BlasterItem;
		this.bulletWidth = 5;
		this.bulletHeight = 12;
	}

	fire(x,y,angle,color,id){
		if(this.onCoolDown()){
			return;
		}
		var bullets = [];
		if(this.level > 1){
			var bull1 = new Bullet(x,y,this.bulletWidth,this.bulletHeight, angle, color, id);
			bull1.speed -= bull1.speed * .15;
			bullets.push(bull1);
		}
		bullets.push(new Bullet(x,y,this.bulletWidth,this.bulletHeight, angle, color, id));
		return bullets;
	}
	upgrade(){
		super.upgrade();
		if(this.level == 3){
			this.cooldown = c.blasterCoolDown - .3;
		}
	}
}

class PhotonCannon extends Weapon{
	constructor(owner,level){
		super(owner);
		this.name = "PhotonCannon";
		this.level = level;
		this.cooldown = c.photonCannonCoolDown;
		this.equipMessage = "Equiped Photon Cannon";
		this.upgradeMessage ="Upgraded Photon Cannon";
		this.item = PhotonCannonItem;
	}

	fire(x,y,angle,color,id){
		if(this.onCoolDown()){
			return;
		}
		var bullets = [];
		if(this.level > 1){
			var shot1 = new Birdshot(x,y,4,10, angle-7.5, color, id);
			var shot3 = new Birdshot(x,y,4,10, angle+7.5, color, id);
			bullets.push(shot1,shot3);
		}
		if(this.level > 2){
			var shot1 = new Birdshot(x,y,4,10, angle-15, color,id);
			shot1.speed -= 4;
			var shot2 = new Birdshot(x,y,4,10, angle, color, id);
			shot2.speed -= 4;
			var shot3 = new Birdshot(x,y,4,10, angle+15, color, id);
			shot3.speed -= 4;
			bullets.push(shot1,shot2,shot3);
		}
		bullets.push(new Birdshot(x,y,4,10,angle-5, color,id));
		bullets.push(new Birdshot(x,y,4,10, angle-2.5, color, id));
		bullets.push(new Birdshot(x,y,4,10, angle, color, id));
		bullets.push(new Birdshot(x,y,4,10, angle+2.5, color, id));
		bullets.push(new Birdshot(x,y,4,10, angle+5, color, id));
		return bullets;
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
		this.level = level;
		this.cooldown = c.massDriverCoolDown;
		this.equipMessage = "Equiped Mass Driver";
		this.upgradeMessage = "Upgraded Mass Driver";
		this.threeShot = false;
		this.item = MassDriverItem;
	}
	fire(x,y,angle,color,id){
		if(this.onCoolDown()){
			return;
		}
		var bullets = [];
		var bullet = new MassDriverBullet(x,y,8,20, angle, color, id);
		if(this.level > 1){
			bullet.speed += bullet.speed * .35;
		}
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
		super(0,0,c.shieldRadius,"Aqua");
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
			this.color = "Aqua";
			return;
		}
		if(this.health > c.shield1Protection && this.health <= c.shield2Protection){
			this.level = 2;
			this.color = "#FFFF00";
			return;
		}
		if(this.health > c.shield2Protection && this.health <= c.shield3Protection){
			this.level = 3;
			this.color = "#FF6347";
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
		this.speed = c.blasterBulletSpeed;
		this.damage = c.blasterBulletDamage;
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
			return
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
		//this.killSelf();
		return true;
	}
	killSelf(){
		this.alive = false;
	}
}

class Birdshot extends Bullet{
	constructor(x,y,width,height, angle, color, owner){
		super(x,y,width,height, angle, color, owner);
		this.damage = c.birdshotDamage;
		this.speed = c.birdshotSpeed;
	}

}

class MassDriverBullet extends Bullet{
	constructor(x,y,width,height, angle, color, owner){
		super(x,y,width,height,angle, color, owner);
		this.damage = c.massDriverBulletDamage;
		this.speed = c.massDriverBulletSpeed;
	}
}
