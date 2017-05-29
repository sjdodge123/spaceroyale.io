"use strict";
var utils = require('./utils.js');

exports.getEngine = function(bulletList,shipList,asteroidList,planetList){
	return new Engine(bulletList,shipList,asteroidList,planetList);
}
exports.preventEscape = function(obj,bound){
	preventEscape(obj,bound);
}
exports.preventMovement = function(obj,wall,dt){
	preventEscape(obj,wall,dt);
}

class Engine {
	constructor(bulletList,shipList,asteroidList,planetList){
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.asteroidList = asteroidList;
		this.planetList = planetList;
		this.dt = 0;
	}

	update(dt){
		this.dt = dt;
		this.updateBullets();
		this.updateShips();
	}

	updateBullets(){
		for (var bulletSig in this.bulletList){
			var bullet = this.bulletList[bulletSig];
			bullet.velX = Math.cos((bullet.angle+90)*(Math.PI/180))*bullet.speed;
			bullet.velY = Math.sin((bullet.angle+90)*(Math.PI/180))*bullet.speed;
			bullet.newX += bullet.velX * this.dt;
			bullet.newY += bullet.velY * this.dt;
		}
	}

	updateShips(){
		for (var shipSig in this.shipList){
			var ship = this.shipList[shipSig];
			var dirX = 0;
			var dirY = 0;

			if(ship.moveForward && ship.moveBackward == false && ship.turnLeft == false && ship.turnRight == false){
				dirY = -1;
				dirX = 0;
			}
			else if(ship.moveForward == false && ship.moveBackward && ship.turnLeft == false && ship.turnRight == false){
				dirY = 1;
				dirX = 0;
			}
			else if(ship.moveForward == false && ship.moveBackward == false && ship.turnLeft && ship.turnRight == false){
				dirY = 0;
				dirX = -1;
			}
			else if(ship.moveForward == false && ship.moveBackward == false && ship.turnLeft == false && ship.turnRight){
				dirY = 0;
				dirX = 1;
			}
			else if(ship.moveForward && ship.moveBackward == false && ship.turnLeft && ship.turnRight == false){
				dirY = -Math.sqrt(2)/2;
				dirX = -Math.sqrt(2)/2;
			}
			else if(ship.moveForward && ship.moveBackward == false && ship.turnLeft == false && ship.turnRight){
				dirY = -Math.sqrt(2)/2;
				dirX = Math.sqrt(2)/2;
			}
			else if(ship.moveForward == false && ship.moveBackward && ship.turnLeft && ship.turnRight == false){
				dirY = Math.sqrt(2)/2;
				dirX = -Math.sqrt(2)/2;
			}
			else if(ship.moveForward == false && ship.moveBackward && ship.turnLeft == false && ship.turnRight){
				dirY = Math.sqrt(2)/2;
				dirX = Math.sqrt(2)/2;
			}
			if(ship.velocity < ship.maxVelocity){
				ship.velX += ship.acel * dirX * this.dt - .1*ship.velX;
				ship.velY += ship.acel * dirY * this.dt - .1*ship.velY;
			} else{
				ship.velX += ship.acel * dirX * this.dt - .5*ship.velX;
				ship.velY += ship.acel * dirY * this.dt - .5*ship.velY;
			}
			ship.velocity = utils.getMag(ship.velX,ship.velY);
			ship.newX += ship.velX * this.dt;
			ship.newY += ship.velY * this.dt;
		}
	}

	broadBase(objectArray){
		for (var i = 0; i < objectArray.length; i++) {
	  		for (var j = 0; j < objectArray.length; j++) {

	    		if(objectArray[i] == objectArray[j]){
	    		  continue;
	    		}
	    		var obj1 = objectArray[i],
	    			obj2 = objectArray[j];

	    		if(checkDistance(obj1,obj2)){
	  				obj1.handleHit(obj2);
	  				obj2.handleHit(obj1);
	    		}
	  		}
  		}
	}

	checkCollideAll(loc,obj){
		var result = false;
		var testLoc = {x:loc.x, y:loc.y, r:(obj.width || obj.radius)};
		var objectArray = [];
		for(var shipSig in this.shipList){
			objectArray.push(this.shipList[shipSig]);
		}
		for(var asteroidSig in this.asteroidList){
			objectArray.push(this.asteroidList[asteroidSig]);
		}
		for(var planetSig in this.planetList){
			objectArray.push(this.planetList[planetSig]);
		}
		for(var sig in this.bulletList){
			objectArray.push(this.bulletList[sig]);
		}
		for(var i = 0; i < objectArray.length; i++){
			result = checkDistance(testLoc, objectArray[i]);
			if(result){
				break;
			}
		}
		return result;
	}

	
}

function checkDistance(obj1,obj2){
	var objX1 = obj1.newX || obj1.x;
	var objY1 = obj1.newY || obj1.y;
	var objX2 = obj2.newX || obj2.x;
	var objY2 = obj2.newY || obj2.y;
	var distance = utils.getMag(objX2 - objX1,objY2 - objY1);
  	distance -= obj1.radius || obj1.width;
	distance -= obj2.radius || obj2.width;
	if(distance <= 0){
		return true;
	}
	return false;
}

function preventMovement(obj,wall,dt){
	var bx = wall.x - obj.x;
	var by = wall.y - obj.y;
	var bMag = utils.getMag(bx,by);
	var bxDir = bx/bMag;
	var byDir = by/bMag;
	var dot = bxDir*obj.velX+byDir*obj.velY;
	var ax = dot * bxDir;
	var ay = dot * byDir;
	obj.velX -= ax;
	obj.velY -= ay;
	obj.newX = obj.x+obj.velX*dt;
	obj.newY = obj.y+obj.velY*dt;
}

function preventEscape(obj,bound){
	if(obj.newX - obj.width/2 < bound.x){
		obj.newX = obj.x;
	}
	if(obj.newX + obj.width/2 > bound.x + bound.width){
		obj.newX = obj.x;
	}
	if (obj.newY - obj.height/2 < bound.y){
		obj.newY = obj.y;
	}
	if(obj.newY + obj.height/2 > bound.y + bound.height){
		obj.newY = obj.y;
	}
}


