'use strict';

exports.getWorld = function() {
    return new World(0,0,300,300);
};

exports.getTimer = function(callback,delay){
	return new Timer(callback,delay);
};

exports.getRect = function(x,y,width,height){
	return new Rect(x,y,width,height);
}
exports.getCircle = function(x,y,radius){
	return new Circle(x,y,radius);
}
exports.getShip = function(x,y,width,height,color){
	return new Ship(x,y,width,height,color);
}

exports.getRoom = function(sig,size){
	return new Room(sig,size);
}

class Room {
	constructor(sig,size){
		this.sig = sig;
		this.size = size;
		this.world = new World(0,0,300,300);
		this.clientList = {};
		this.asteroidList = {};
		this.bulletList = {};
		this.shipList = {};
		this.clientCount = 0;
		this.game = new Game(this.world,this.clientList,this.bulletList,this.shipList,this.asteroidList);
	}
	join(client){
		client.join(this.sig);
		this.clientCount++;
	}
	leave(client){
		client.leave(this.sig)
		this.clientCount--;
	}
	update(){
		this.game.update();
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
			if(!this.game.active){
				return true;
			}
		}
		return false;
	}
	
}

class Game {
	constructor(world,clientList,bulletList,shipList,asteroidList){
		this.world = world;
		this.clientList = clientList;
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.asteroidList = asteroidList;

		//Gamerules
		this.minPlayers = 2;
		this.density = 10;
		this.active = false;
		this.shrinkTime = 60,
		this.shrinkTimer = null;
		this.shrinkTimeLeft = 60;
		this.gameEnded = false;
		this.winner = null;

		this.lobbyTimer = null;
		this.lobbyWaitTime = 5;
		this.lobbyTimeLeft = this.lobbyWaitTime;

		this.gameBoard = new GameBoard(world,clientList,bulletList,shipList,asteroidList);
	}

	start(){
		this.active = true;
		this.gameBoard.populateWorld(this.density);
		this.randomLocShips();
		this.world.drawNextBound();
		var gamew = this;
		this.shrinkTimer = new Timer(function(){gamew.world.shrinkBound();},this.shrinkTime*1000);
	}

	reset(){
		this.world.reset();
		this.shrinkTimer.reset();
	}

	gameover(){
		this.active = false;
		for(var shipID in this.shipList){
			console.log(this.clientList[shipID]+" wins!");
			this.winner = shipID;
			this.gameEnded = true;
		}
	}

	update(){
		if(this.active){
			this.checkForWin()
			this.shrinkTimeLeft = this.shrinkTimer.getTimeLeft().toFixed(1);
		} else{
			this.checkForGameStart()
		}
		this.gameBoard.update(this.active);
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
				this.lobbyTimer = new Timer(function(){game.start();},this.lobbyWaitTime*1000);
			} else{
				this.lobbyTimeLeft = this.lobbyTimer.getTimeLeft().toFixed(1);
			}
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
			var loc = this.world.getRandomLoc();
			ship.x = loc.x;
			ship.y = loc.y;
		}
	}
}

class GameBoard {
	constructor(world,clientList,bulletList,shipList,asteroidList){
		this.world = world;
		this.clientList = clientList;
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.asteroidList = asteroidList;
	}
	update(active){
		this.checkCollisions();
		this.updateShips(active);
		this.updateBullets();
	}
	updateShips(active){
		for(var shipID in this.shipList){
			var ship = this.shipList[shipID];
			//TODO: Check for hit first!!
			if(active){
				this.world.checkForMapDamage(ship);
			}
			ship.update();
		}
	}
	updateBullets(){
		for(var sig in this.bulletList){
			this.bulletList[sig].update();
		}
	}
	checkCollisions(){
		var objectArray = [];
		for(var ship in this.shipList){
			objectArray.push(this.shipList[ship]);
		}
		for(var sig in this.bulletList){
			objectArray.push(this.bulletList[sig]);
		}
		this.broadBase(objectArray);
	}
	broadBase(objectArray){
		for (var i = 0; i < objectArray.length; i++) {
    		for (var j = 0; j < objectArray.length; j++) {
	    		if(objectArray[i] == objectArray[j]){
	    			continue;
	    		}
	    		var obj1 = objectArray[i],
	    			obj2 = objectArray[j];

	    		if(this.checkDistance(obj1,obj2)){
	    			obj1.isHit = true;
	    			obj1.color = obj1.hitColor;

	    			obj2.isHit = true;
	    			obj2.color = obj2.hitColor;
	    		} else{
	    			obj1.isHit = false;
	    			obj1.color = obj1.baseColor;

	    			obj2.isHit = false;
	    			obj2.color = obj2.baseColor;;
	    		}
    		}
    	}
	}
	checkDistance(obj1,obj2){
		var distance = Math.sqrt(Math.pow((obj2.x - obj1.x),2) + Math.pow((obj2.y - obj1.y),2));
		if(distance < 10){
			return true;
		}
		return false;
	}
	spawnNewBullet(ship){
		var sig = this.generateBulletSig();
		var bullet = ship.fire(sig);
		this.bulletList[sig] = bullet;
		setTimeout(this.terminateBullet,bullet.lifetime*1000,{sig:sig,bulletList:this.bulletList});
	}
	terminateBullet(packet){
		if(packet.bulletList[packet.sig] != undefined){
			delete packet.bulletList[packet.sig];
		}
	}
	generateBulletSig(){
		var sig = this.getRandomInt(0,99999);
		if(this.bulletList[sig] == null || this.bulletList[sig] == undefined){
			return sig;
		}
		return this.generateBulletSig();
	}
	generateAsteroidSig(){
		var sig = this.getRandomInt(0,99999);
		if(this.asteroidList[sig] == null || this.asteroidList[sig] == undefined){
			return sig;
		}
		return this.generateAsteroidSig();
	}
	getRandomInt(min,max){
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
	}
	populateWorld(density){
		for(var i = 0; i<this.world.width/density;i++){
			var loc = this.world.getRandomLoc();
			var sig = this.generateAsteroidSig();
			this.asteroidList[sig] = new Asteroid(loc.x,loc.y,this.getRandomInt(0,10),sig);
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

}

class World extends Rect{
	constructor(x,y,width,height){
		super(x,y,width,height,"orange");
		this.baseBoundRadius = width;
		this.damageRate = 2;
		this.damagePerTick = 15;
		this.whiteBound = new WhiteBound(width/2,height/2,this.baseBoundRadius);
		this.blueBound = new BlueBound(width/2,height/2,this.baseBoundRadius);
		this.center = {x:width/2,y:height/2};	
	}
	drawNextBound(){
		this.whiteBound = this._drawWhiteBound();
	}
	_drawWhiteBound(){
		var loc = this.getRandomLoc();
		var whiteBound = new WhiteBound(loc.x,loc.y,this.whiteBound.radius/2);
		if(!this.inBounds(whiteBound)){
			whiteBound = this._drawWhiteBound();
		}
		return whiteBound;
	}
	getRandomLoc(){
		 return {x:Math.floor(Math.random()*(this.width - this.x)) + this.x,y:Math.floor(Math.random()*(this.height - this.y)) + this.y};
	}
	shrinkBound(){
		console.log("Shrinking bounds");
	}
	getWhiteBound(){

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
		return new Ship(loc.x,loc.y,10,10,color,id)
	}
}

class Bound extends Circle{
	constructor(x,y,radius,color){
		super(x,y,radius,color);
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
	constructor(x,y,width,height,color,id){
		super(x,y,width,height,color);
		this.health = 100;
		this.baseColor = color;
		this.hitColor = "red";
		this.angle = 90;
		this.isHit = false;
		this.damageTimer = false;
		this.moveForward = false;
		this.moveBackward = false;
		this.turnLeft = false;
		this.turnRight = false;
		this.alive = true;
		this.id = id;
	}
	update(){
		this.checkHP();
		this.move();
	}
	fire(sig){
		return new Bullet(this.x,this.y,2,6,this.baseColor,this.angle,this.id,sig);
	}
	move(){
		if(this.moveForward){
			this.y -= 1;
		}
		if(this.moveBackward){
			this.y += 1;
		}
		if(this.turnLeft){
			this.x -= 1;
		}
		if(this.turnRight){
			this.x += 1;
		}
	}
	checkHP(){
		if(this.health < 1){
			this.alive = false;
		}
	}
}

class Bullet extends Rect{
	constructor(x,y,width,height,color,angle,owner,sig){
		super(x,y,width,height,color);
		this.angle = angle;
		this.owner = owner;
		this.sig = sig;

		this.lifetime = 5;
		this.speed = 5;
		this.velX = 0;
		this.velY = 0;
		this.damage = 30;	
	}
	update(){
		this.velX = Math.cos((this.angle+90)*(Math.PI/180))*this.speed;
		this.velY = Math.sin((this.angle+90)*(Math.PI/180))*this.speed;
		this.move();
	}
	move(){
		this.x += this.velX;
		this.y += this.velY;
	}
}

class Asteroid extends Circle{
	constructor(x,y,radius,sig){
		super(x,y,radius,"orange");
		this.sig = sig;
	}
}

class Timer {
	constructor(callback,delay){
		this.callback = callback;
		this.delay = delay;
		this.running = false;
		this.started = null;
		this.remaining = delay;
		this.id = null;
		this.start();
	}
	start() {
        this.running = true;
        this.started = new Date()
        this.id = setTimeout(this.callback, this.remaining);
    }

    pause(){
    	this.running = false;
    	clearTimeout(this.id);
    	this.remaining -= new Date() - this.started;
    }
    getTimeLeft(){
    	if(this.running){
    		this.pause();
    		this.start();
    	}
    	return this.remaining/1000;
    }
    reset(){
    	this.running = false;
    	clearTimeout(this.id);
    	this.remaining = this.delay;
    	this.started = null;
    }
    isRunning(){
    	return this.running;
    }
}