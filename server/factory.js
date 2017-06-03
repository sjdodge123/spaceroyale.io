'use strict';

var c = require('./config.json');
var utils = require('./utils.js');
var messenger = require('./messenger.js');
var database = require('./database.js');
var _engine = require('./engine.js');

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
		this.killedShips = {};
		this.clientCount = 0;
		this.alive = true;
		this.engine = _engine.getEngine(this.bulletList, this.shipList, this.world, this.asteroidList, this.planetList,this.nebulaList,this.tradeShipList);
		this.world = new World(0,0,c.lobbyWidth,c.lobbyHeight,this.engine);
		this.game = new Game(this.world,this.clientList,this.bulletList,this.shipList,this.asteroidList,this.planetList,this.itemList,this.nebulaList,this.tradeShipList,this.engine,this.sig);
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
				this.game.gameBoard.spawnItem(ship.weapon.drop(ship.x,ship.y));
				if(ship.killedBy != null){
					var murderer = this.shipList[ship.killedBy];
					var murdererName = this.clientList[ship.killedBy];
					var deadPlayerName = this.clientList[shipID];
					murderer.killList.push(deadPlayerName);
					messenger.messageRoomByUserID(murderer.id,"eventMessage",murdererName + " killed " + deadPlayerName);
					messenger.toastPlayer(murderer.id,"You killed " + deadPlayerName);
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
			bulletList:this.bulletList,
			asteroidList:this.asteroidList,
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
	constructor(world,clientList,bulletList,shipList,asteroidList,planetList,itemList,nebulaList,tradeShipList,engine,roomSig){
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

		this.gameEnded = false;
		this.firstPass = true;
		this.winner = null;
		this.active = false;
		this.lobbyTimer = null;
		this.lobbyTimeLeft = this.lobbyWaitTime;

		this.gameBoard = new GameBoard(world,clientList,bulletList,shipList,asteroidList,planetList,itemList,nebulaList,this.tradeShipList,engine);
	}

	start(){
		messenger.messageRoomBySig(this.roomSig,'gameStart',null);
		this.gameBoard.clean();
		this.active = true;
		this.world.resize();
		this.gameBoard.populateWorld();
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
		for(var shipID in this.shipList){
			console.log(this.clientList[shipID]+" wins!");
			this.winner = shipID;
			this.gameEnded = true;
		}
	}

	update(dt){
		if(this.active){
			if(this.timerUntilShrink != null){
        		this.timeLeftUntilShrink = this.timerUntilShrink.getTimeLeft().toFixed(1);
      		}
		    if(this.shrinkingTimer != null){
		        this.shrinkTimeLeft = this.shrinkingTimer.getTimeLeft().toFixed(1);
		    }
			this.checkForWin();
		} else{
			this.checkForGameStart()
		}
		this.gameBoard.update(this.active, dt);
		this.world.update(this.shrinkTimeLeft);
	}

	checkForWin(){
		if(this.getShipCount() == 1){
			this.gameover();
		}
	}

	checkForGameStart(){
		if(this.getShipCount() >= this.minPlayers){
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
		return shipCount;
	}
	randomLocShips(){
		for(var shipID in this.shipList){
			var ship = this.shipList[shipID];
			var loc = this.world.findFreeLoc(ship);
			ship.newX = loc.x;
			ship.newY = loc.y;
		}
	}
}

class GameBoard {
	constructor(world,clientList,bulletList,shipList,asteroidList,planetList,itemList,nebulaList,tradeShipList,engine){
		this.world = world;
		this.clientList = clientList;
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.asteroidList = asteroidList;
		this.planetList = planetList;
		this.itemList = itemList;
		this.nebulaList = nebulaList;
		this.tradeShipList = tradeShipList;
		this.engine = engine;
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
		for(var sig in this.bulletList){
			var bullet = this.bulletList[sig];
			if(bullet.alive == false){
				delete this.bulletList[sig];
				continue;
			}
			bullet.update();
		}
	}
	updateAsteroids(){
		for(var asteroidSig in this.asteroidList){
			var asteroid = this.asteroidList[asteroidSig];
			if(asteroid.alive == false){
				this.terminateAsteroid(asteroid);
				continue;
			}
			asteroid.update();

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

	checkCollisions(active){
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
	}
	terminateBullet(packet){
		if(packet.bulletList[packet.sig] != undefined){
			delete packet.bulletList[packet.sig];
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
				var loc = this.world.getSafeLoc(c.asteroidMaxSize);
				var sig = this.generateAsteroidSig();
				this.asteroidList[sig] = new Asteroid(loc.x,loc.y,utils.getRandomInt(c.asteroidMinSize,c.asteroidMaxSize),sig);
			}
		}
		if(c.generatePlanets){
			for(var i = 0; i<c.planetAmt;i++){
				var loc = this.world.getSafeLoc(c.planetMaxSize);
				var sig = this.generatePlanetSig();
				this.planetList[sig] = new Planet(loc.x,loc.y,utils.getRandomInt(c.planetMinSize,c.planetMaxSize),sig);
			}
		}
		if(c.generateNebulas){
			for(var i = 0; i<c.nebulaAmt;i++){
				var loc = this.world.getSafeLoc(c.nebulaMaxSize);
				var sig = this.generateNebulaSig();
				this.nebulaList[sig] = new Nebula(loc.x,loc.y,utils.getRandomInt(c.nebulaMinSize,c.nebulaMaxSize),sig);
			}
		}
		if(c.generateTradeShips){
			for(var i = 0; i<c.tradeShipAmt;i++){
				var loc = this.world.getTradeShipLoc();
				var sig = this.generateTradeShipSig();
				this.tradeShipList[sig] = new TradeShip(loc.x1,loc.y1,180,60,utils.getRandomInt(c.tradeShipMinDelay,c.tradeShipMaxDelay),loc.x2,loc.y2);
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
		if(shape instanceof Rect){
			return this.testRect(shape);
		}
		if(shape instanceof Circle){
			return this.testCircle(shape);
		}
		return false;
	}
}

class Rect extends Shape{
	constructor(x,y,width,height,color){
		super(x,y,color);
		this.width = width;
		this.height = height;
	}
	testRect(rect){
		if(this.x < rect.x &&
           this.x + this.width > rect.x &&
           this.y < rect.y &&
           this.y + this.height > rect.y
           ){
           return true;
        }
        return false;
	}
	testCircle(circle){
		var distX = Math.abs(circle.x - this.x-this.width/2);
		var distY = Math.abs(circle.y - this.y-this.height/2);
		if(distX > (this.width/2 + circle.radius)){return false;}
		if(distY > (this.height/2 + circle.radius)){return false;}
		if(distX <= (this.width/2)){return true;}
		if(distY <= (this.height/2)){return true;}
		var dx = distX-this.width/2;
		var dy = distY-this.height/2;
		return (dx*dx+dy*dy<=(circle.radius*circle.radius));
	}
}

class Circle extends Shape{
	constructor(x,y,radius,color){
		super(x,y,color);
		this.radius = radius;
	}
	testRect(rect){
		var distance = Math.sqrt(Math.pow(rect.x-this.x,2) + Math.pow(rect.y-this.y,2));
		if(distance+rect.width <= this.radius){
			return true;
		}
		return false;
	}

	testCircle(circle){
		var distance = Math.sqrt(Math.pow(circle.x-this.x,2) + Math.pow(circle.y-this.y,2));
		if(distance+circle.radius <= this.radius){
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
	constructor(x,y,width,height,engine){
		super(x,y,width,height,"orange");
		this.baseBoundRadius = width;
		this.damageRate = c.damageTickRate;
		this.damagePerTick = c.damagePerTick;
		this.shrinking = false;
		this.whiteBound = new WhiteBound(width/2,height/2,this.baseBoundRadius);
		this.blueBound = new BlueBound(width/2,height/2,this.baseBoundRadius);
		this.center = {x:width/2,y:height/2};
		this.engine = engine;
	}
	update(timeLeft){
		this.updateBounds(timeLeft);
	}
	updateBounds(timeLeft){
		if(this.shrinking){
	      this.blueBound.velX = (this.whiteBound.x - this.blueBound.x)/(60*timeLeft);
	      this.blueBound.velY = (this.whiteBound.y - this.blueBound.y)/(60*timeLeft);
	      this.blueBound.x += this.blueBound.velX;
	      this.blueBound.y += this.blueBound.velY;
      	  this.blueBound.radius -= (this.blueBound.radius - this.whiteBound.radius)/(60*timeLeft);
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
	}

	drawNextBound(){
		this.whiteBound = this._drawWhiteBound();
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
		var loc = this.getRandomLoc();
		if(this.engine.checkCollideAll(loc, obj)){
			return this.findFreeLoc(obj);
		}
		return loc;
	}
	getSafeLoc(size){
		var objW = size + 15;
		var objH = size + 15;
		return {x:Math.floor(Math.random()*(this.width - 2*objW - this.x)) + this.x + objW, y:Math.floor(Math.random()*(this.height - 2*objH - this.y)) + this.y + objH};
	}
	getRandomLoc(){
		return {x:Math.floor(Math.random()*(this.width - this.x)) + this.x, y:Math.floor(Math.random()*(this.height - this.y)) + this.y};
	}
	getTradeShipLoc(){
		return {x1:0,y1:0,x2:0,y2:0};
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
		var loc = this.getRandomLoc();
		return new Ship(loc.x,loc.y,color,id);
	}
}

class Bound extends Circle{
	constructor(x,y,radius,color){
		super(x,y,radius,color);
		this.velX = 0;
		this.velY = 0;
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

class Ship extends Rect{
	constructor(x,y,color,id){
		super(x,y,25,25,color);
		this.baseHealth = 100;
		this.health = this.baseHealth;
		this.baseColor = color;
		this.glowColor = color;
		this.angle = 90;
		this.isHit = false;
		this.damageTimer = false;
		this.moveForward = false;
		this.moveBackward = false;
		this.turnLeft = false;
		this.turnRight = false;
		this.alive = true;
		this.speed = c.playerBaseSpeed;
		this.id = id;
		this.killList = [];
		this.killedBy = null;
		this.weapon = new Pistol(this.id);
		this.weapon.level = 1;
		this.shield = null;
		this.newX = this.x;
		this.newY = this.y;
		this.maxVelocity = 294;
		this.velocity = 0;
		this.acel = 10000;
		this.velX = 0;
		this.velY = 0;
		this.droppedItem = null;
		this.dt = 0;
	}
	update(dt){
		this.dt = dt;
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
		if(item instanceof PistolItem){
			if(this.weapon instanceof Pistol){
				this.weapon.upgrade();
				return;
			}
			this.droppedItem = this.weapon.drop(this.x,this.y,this.weapon.level);
			this.weapon = new Pistol(this.id,item.level);
			this.weapon.equip();
			return;
		}
		if(item instanceof ShotgunItem){
			if(this.weapon instanceof Shotgun){
				this.weapon.upgrade();
				return;
			}
			this.droppedItem = this.weapon.drop(this.x,this.y,this.weapon.level);
			this.weapon = new Shotgun(this.id,item.level);
			this.weapon.equip();
			return;
		}
		if(item instanceof RifleItem){
			if(this.weapon instanceof Rifle){
				this.weapon.upgrade();
				return;
			}
			this.droppedItem = this.weapon.drop(this.x,this.y,this.weapon.level);
			this.weapon = new Rifle(this.id,item.level);
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
		messenger.messageRoomByUserID(this.id,'weaponFired',{ship:this,weapon:this.weapon});
		return this.weapon.fire(this.x,this.y,this.angle,this.baseColor,this.id);
	}
	move(){
		this.x = this.newX;
		this.y = this.newY;
	}
	handleHit(object){
		if(object.isWall){
			_engine.preventMovement(this,object,this.dt);
		}
		if(object.isNebula){
			_engine.slowDown(this,this.dt,object.slowAmt);
			return;
		}
		if(object.owner != this.id && object.alive && object.damage != null){
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
	constructor(x,y,radius,sig){
		super(x,y,radius,"orange");
		this.sig = sig;
		this.isWall = true;
		this.item = null;
		this.dropRate = c.asteroidDropRate;
		this.lootTable = c.asteroidLootTable;
		this.baseHealth = 40;
		this.damage = 0;
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
			this.health -= object.damage;
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
			case "PistolItem": {
				item = new PistolItem(this.x,this.y);
				break;
			}
			case "ShotgunItem": {
				item = new ShotgunItem(this.x,this.y);
				break;
			}
			case "RifleItem": {
				item = new RifleItem(this.x,this.y);
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
	constructor(x,y,width,height,delay,destX,destY){
		super(x,y,width,height,"#808080");
		this.delay = delay;
		this.destX = destX;
		this.destY = destY;
		this.health = 100;
		this.item = RifleItem;
		this.alive = true;
		this.sig = null;
	}
	update(){

	}
	dropItem(){
		var item = new this.item(this.x+this.width/2,this.y+this.height/2,1);
		return item;
	}
	handleHit(object){
		if(object.alive && object.damage != null){
			this.health -= object.damage;
			if(this.health < 1){
				this.alive = false;
			}
		}
	}
}

class RectItem extends Rect{
	constructor(x,y,color){
		super(x,y,15,15,color);
		this.isItem = true;
		this.sig = null;
		this.alive = true;
	}
}

class HPItem extends RectItem {
	constructor(x,y){
		super(x,y,"Red");
		this.healAmt = 15;
		this.equipMessage = "Applied health pack +" + this.healAmt;
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

class EquipableItem extends RectItem{
	constructor(x,y,color,level){
		super(x,y,color);
		this.dropDate = null;
		this.pickUpCooldown = 1;
		this.level = level || 1;
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

class PistolItem extends EquipableItem {
	constructor(x,y,level){
		super(x,y,"Magenta",level);
	}
}

class ShotgunItem extends EquipableItem {
	constructor(x,y,level){
		super(x,y,"Yellow",level);
	}
}
class RifleItem extends EquipableItem {
	constructor(x,y,level){
		super(x,y,"Green",level);
	}
}
class ShieldItem extends EquipableItem {
	constructor(x,y){
		super(x,y,"Aqua");
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

class Pistol extends Weapon{
	constructor(owner,level){
		super(owner);
		this.level = level;
		this.name = "Pistol";
		this.cooldown = c.basegunCoolDown;
		this.maxLevel = 1;
		this.equipMessage = "Equiped Pistol";
		this.upgradeMessage ="Upgraded Pistol";
		this.item = PistolItem;
	}

	fire(x,y,angle,color,id){
		if(this.onCoolDown()){
			return;
		}
		var bullets = [];
		bullets.push(new Bullet(x,y,5,12,color,angle,id));
		return bullets;
	}
}

class Shotgun extends Weapon{
	constructor(owner,level){
		super(owner);
		this.name = "Shotgun";
		this.level = level;
		this.cooldown = c.shotgunCoolDown;
		this.equipMessage = "Equiped Shotgun";
		this.upgradeMessage ="Upgraded Shotgun";
		this.item = ShotgunItem;
	}

	fire(x,y,angle,color,id){
		if(this.onCoolDown()){
			return;
		}
		var bullets = [];
		if(this.level > 1){
			var shot1 = new Birdshot(x,y,4,10,color,angle-7.5,id);
			var shot3 = new Birdshot(x,y,4,10,color,angle+7.5,id);
			bullets.push(shot1,shot3);
		}
		if(this.level > 2){

			var shot1 = new Birdshot(x,y,4,10,color,angle-15,id);
			shot1.speed -= 4;
			var shot2 = new Birdshot(x,y,4,10,color,angle,id);
			shot2.speed -= 4;
			var shot3 = new Birdshot(x,y,4,10,color,angle+15,id);
			shot3.speed -= 4;
			bullets.push(shot1,shot2,shot3);

		}
		bullets.push(new Birdshot(x,y,4,10,color,angle-5,id));
		bullets.push(new Birdshot(x,y,4,10,color,angle-2.5,id));
		bullets.push(new Birdshot(x,y,4,10,color,angle,id));
		bullets.push(new Birdshot(x,y,4,10,color,angle+2.5,id));
		bullets.push(new Birdshot(x,y,4,10,color,angle+5,id));
		return bullets;
	}
	upgrade(){
		super.upgrade();
		if(this.level == 3){
			this.cooldown -= .3;
		}
	}
}

class Rifle extends Weapon{
	constructor(owner,level){
		super(owner);
		this.name = "Rifle";
		this.level = level;
		this.cooldown = c.rifleCoolDown;
		this.maxLevel = 1;
		this.equipMessage = "Equiped Rifle";
		this.upgradeMessage = "Upgraded Rifle";
		this.item = RifleItem;
	}
	fire(x,y,angle,color,id){
		if(this.onCoolDown()){
			return;
		}
		var bullets = [];
		bullets.push(new RifleBullet(x,y,8,20,color,angle,id));
		return bullets;
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
	constructor(x,y,width,height,color,angle,owner){
		super(x,y,width,height,color);
		this.angle = angle;
		this.alive = true;
		this.owner = owner;
		this.sig = null;

		this.lifetime = c.bulletLifetime;
		this.speed = c.bulletSpeed;
		this.damage = c.bulletDamage;
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
		if(object.isNebula){
			return;
		}
		if(object.isItem){
			return;
		}
		this.alive = false;
	}
}

class Birdshot extends Bullet{
	constructor(x,y,width,height,color,angle,owner){
		super(x,y,width,height,color,angle,owner);
		this.damage = c.birdshotDamage;
		this.speed = c.birdshotSpeed;
	}

}

class RifleBullet extends Bullet{
	constructor(x,y,width,height,color,angle,owner){
		super(x,y,width,height,color,angle,owner);
		this.damage = c.rifleBulletDamage;
		this.speed = c.rifleBulletSpeed;
	}
}
