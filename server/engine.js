"use strict";
var utils = require('./utils.js');
var c = utils.loadConfig();

var forceConstant = c.forceConstant;

exports.getEngine = function(bulletList,shipList,asteroidList,planetList,nebulaList,tradeShipList,gadgetList,itemList){
	return new Engine(bulletList,shipList,asteroidList,planetList,nebulaList,tradeShipList,gadgetList,itemList);
}
exports.slowDown = function(obj,dt,amt){
	slowDown(obj,dt,amt);
}
exports.preventEscape = function(obj,bound){
	preventEscape(obj,bound);
}
exports.preventMovement = function(obj,wall,dt){
	preventMovement(obj,wall,dt);
}

exports.containsItem = function(itemList, item){
	return containsItem(itemList, item);
}
exports.checkDistance = function(obj1, obj2){
	return checkDistance(obj1, obj2);
}
class Engine {
	constructor(bulletList,shipList,asteroidList,planetList,nebulaList,tradeShipList,gadgetList,itemList){
		this.bulletList = bulletList;
		this.shipList = shipList;
		this.itemList = itemList;
		this.asteroidList = asteroidList;
		this.planetList = planetList;
		this.nebulaList = nebulaList;
		this.tradeShipList = tradeShipList;
		this.gadgetList = gadgetList;
		this.dt = 0;
		this.worldWidth = 0;
		this.worldHeight = 0;
		this.quadTree = null;
	}

	update(dt){
		this.dt = dt;
		this.updateBullets();
		this.updateShips();
		this.updateItems();
		this.updateGadgets();
	}

	updateBullets(){
		for (var bulletSig in this.bulletList){
			var bullet = this.bulletList[bulletSig];
			if(bullet.isBeam){
				continue;
			}
			bullet.velX = Math.cos((bullet.angle+90)*(Math.PI/180))*bullet.speed;
			bullet.velY = Math.sin((bullet.angle+90)*(Math.PI/180))*bullet.speed;
			bullet.newX += bullet.velX * this.dt;
			bullet.newY += bullet.velY * this.dt;

			for (var i = 0; i < bullet.vertices.length; i++){
				bullet.vertices[i].x += bullet.velX * this.dt;
				bullet.vertices[i].y += bullet.velY * this.dt;
			}

		}
	}
	updateItems(){
		for(var itemSig in this.itemList){
			var item = this.itemList[itemSig];
			if(item.shouldMove == false){
				continue;
			}
			var newVel = utils.getMag(item.velX,item.velY);
			if (newVel > item.maxVelocity){
				var dirX = item.velX / newVel;
				var dirY = item.velY / newVel;
				item.velX = item.maxVelocity * dirX;
				item.velY = item.maxVelocity * dirY;
			}

			item.velX -= item.dragCoeff*item.velX;
			item.velY -= item.dragCoeff*item.velY;
			item.newX += item.velX * this.dt;
			item.newY += item.velY * this.dt;


		}
	}
	updateGadgets(){
		for (var gadgetSig in this.gadgetList){
			var gadget = this.gadgetList[gadgetSig];
			if(gadget.isStatic){
				continue;
			}

			if(gadget.attached){
				var ship = this.shipList[gadget.owner];
				if(ship == undefined){
					continue;
				}
				gadget.newX = ship.newX;
				gadget.newY = ship.newY;
				gadget.angle = ship.weapon.angle;
				continue;
			}

			gadget.velX = Math.cos((gadget.angle+90)*(Math.PI/180))*gadget.speed;
			gadget.velY = Math.sin((gadget.angle+90)*(Math.PI/180))*gadget.speed;
			gadget.newX += gadget.velX * this.dt;
			gadget.newY += gadget.velY * this.dt;
		}
	}

	updateShips(){
		for (var shipSig in this.shipList){
			var ship = this.shipList[shipSig];
			var dirX = 0;
			var dirY = 0;
			var braking = false;
			if (ship.isAI){
				dirX = ship.targetDirX*.8;
				dirY = ship.targetDirY*.8;
				braking = ship.braking;
			}
			else{
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
				else{
					braking = true;
				}
			}
			var newVelX, newVelY, newVel, newDirX, newDirY;
			newVelX = ship.velX + (ship.acel + ship.getSpeedBonus()) * dirX  * this.dt;
			newVelY = ship.velY + (ship.acel + ship.getSpeedBonus()) * dirY  * this.dt;

			if(braking){
				newVelX -= ship.brakeCoeff * ship.velX;
				newVelY -= ship.brakeCoeff * ship.velY;
			}
			else{
				newVelX -= ship.dragCoeff * ship.velX;
				newVelY -= ship.dragCoeff * ship.velY;
			}

			newVel = utils.getMag(newVelX,newVelY);

			newDirX = newVelX / newVel;
			newDirY = newVelY / newVel;
			if (newVel > ship.maxVelocity){
				ship.velX = ship.maxVelocity * newDirX;
				ship.velY = ship.maxVelocity * newDirY;
			}
			else{
				ship.velX = newVelX;
				ship.velY = newVelY;
			}
			ship.newX += ship.velX * this.dt;
			ship.newY += ship.velY * this.dt;
		}
	}
	checkBloodseeker(currentShip,dist){
		var currentDistance = 0;
		for(var shipID in this.shipList){
			var ship = this.shipList[shipID];
			if(ship == currentShip){
				continue;
			}
			if(ship.lowHP == false){
				continue;
			}
			currentDistance = utils.getMag(currentShip.x-ship.x,currentShip.y-ship.y);
			if(ship.isPassiveEquiped(c.passivesEnum.Bloodseeker) &&  currentDistance < dist){
				return true;
			}
			if(currentShip.isPassiveEquiped(c.passivesEnum.Bloodseeker) && currentDistance < dist){
				return true;
			}
		}
		return false;
	}
	broadBase(objectArray){

		this.quadTree.clear();
		var collidingBeams = [];
		var beamList = [];
		for (var i = 0; i < objectArray.length; i++) {
			if (objectArray[i].isBeam){
				beamList.push(objectArray[i]);
				objectArray.splice(i,1);
				continue;
			}
			this.quadTree.insert(objectArray[i]);
  		}
  		for(var j=0; j<objectArray.length;j++){
  			var obj1 = objectArray[j];
  			var collisionList = [];
  			collisionList = this.quadTree.retrieve(collisionList,obj1);
  			collisionList = collisionList.concat(beamList);
  			this.narrowBase(obj1,collisionList, collidingBeams);
  		}
	}

	narrowBase(obj1,collisionList, collidingBeams){
		var dyingBulletList = [];
		for(var i=0; i<collisionList.length;i++){
			var obj2 = collisionList[i];
			if(obj1 == obj2){
				continue;
			}
    		if(obj1.inBounds(obj2)){
  				if(obj1.handleHit(obj2)){
  					dyingBulletList.push(obj1);
				}
  				if(obj2.handleHit(obj1)){
  					dyingBulletList.push(obj2);
				}
    		}
		}

		for (var j=0; j<dyingBulletList.length;j++){
			dyingBulletList[j].killSelf();
		}
	}



	checkCollideAll(loc){
		var result = false;
		var testLoc = {x:loc.x, y:loc.y, radius:loc.width};
		var objectArray = [];
		for(var shipSig in this.shipList){
			objectArray.push(this.shipList[shipSig]);
		}
		for(var asteroidSig in this.asteroidList){
			objectArray.push(this.asteroidList[asteroidSig]);
		}
		for(var nebulaSig in this.nebulaList){
			objectArray.push(this.nebulaList[nebulaSig]);
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
				return true;
			}
		}
		return result;
	}

	explodeObject(xLoc, yLoc, maxDamage,  radius, implode){
		var distance, ship, item,bullet, velCont;

		for (var shipSig in this.shipList){
			ship = this.shipList[shipSig];
			distance = utils.getMag(xLoc - ship.x, yLoc - ship.y);
			if((distance  <= (radius + ship.radius)) && (distance != 0)){
				velCont = this._calcVelCont(distance,ship,xLoc,yLoc,implode)
				ship.velX += velCont.velContX;
				ship.velY += velCont.velContY;
				ship.takeDamage(maxDamage * Math.abs(radius-distance)/radius);
			}
		}
		for (var itemSig in this.itemList){
			item = this.itemList[itemSig];
			distance = utils.getMag(xLoc - item.x, yLoc - item.y);
			if((distance  <= (radius + item.radius)) && (distance != 0)){
				velCont = this._calcVelCont(distance,item,xLoc,yLoc,implode);
				item.velX += velCont.velContX;
				item.velY += velCont.velContY;
			}
		}
		if(implode){
			for(var bulletSig in this.bulletList){
				bullet = this.bulletList[bulletSig];
				distance = utils.getMag(xLoc - bullet.x, yLoc - bullet.y);
				if((distance  <= radius) && (distance != 0)){
					bullet.angle = bullet.angle+180;
					bullet.owner = '00';
				}
			}
		}
	}
	_calcVelCont(distance,object,x,y,implode){
		var velCont = {velContX:0,velContY:0};
		if(implode == true){
			velCont.velContX = -c.pulseForceMultiplier*forceConstant*(object.x - x);///distance;
			velCont.velContY = -c.pulseForceMultiplier*forceConstant*(object.y - y);///distance;
		} else{
			velCont.velContX = (forceConstant/Math.pow(distance,2))*(object.x - x)/distance;
			velCont.velContY = (forceConstant/Math.pow(distance,2))*(object.y - y)/distance;
		}
		return velCont;
	}
	setWorldBounds(width,height){
		this.worldWidth = width;
		this.worldHeight = height;
		this.quadTree = new QuadTree(0,this.worldWidth,0,this.worldHeight,c.quadTreeMaxDepth,c.quadTreeMaxCount,-1);
	}
}

class QuadTree {
	constructor(minX, maxX, minY, maxY, maxDepth, maxChildren, level){
		this.maxDepth = maxDepth;
		this.maxChildren = maxChildren;
		this.minX    = minX;
		this.maxX    = maxX;
		this.minY    = minY;
		this.maxY    = maxY;
		this.width   = maxX - minX;
		this.height  = maxY - minY;
		this.level   = level;
		this.nodes   = [];
		this.objects = [];
	}
	clear(){
		this.objects = [];
		this.nodes = [];
	}
	splitNode(){
		var subWidth  = Math.floor((this.width)/2);
		var subHeight = Math.floor((this.height)/2);

		this.nodes.push(new QuadTree(this.minX, this.minX + subWidth, this.minY, this.minY + subHeight, this.maxDepth, this.maxChildren, this.level + 1));
		this.nodes.push(new QuadTree(this.minX + subWidth, this.maxX, this.minY, this.minY + subHeight, this.maxDepth, this.maxChildren, this.level + 1));
		this.nodes.push(new QuadTree(this.minX, this.minX + subWidth, this.minY + subHeight, this.maxY, this.maxDepth, this.maxChildren, this.level + 1));
		this.nodes.push(new QuadTree(this.minX + subWidth, this.maxX, this.minY + subHeight, this.maxY, this.maxDepth, this.maxChildren, this.level + 1));
	}
	getIndex(obj){
		var index = -1;
		var horizontalMidpoint = this.minX + this.width/2;
		var verticalMidpoint   = this.minY + this.height/2;

		var extents = obj.getExtents();

		if (extents.minX > this.minX && extents.maxX < horizontalMidpoint){
			var leftQuadrant = true;
		}
		if (extents.maxX < this.maxX && extents.minX > horizontalMidpoint){
			var rightQuadrant = true;
		}

		if (extents.minY > this.minY && extents.maxY < verticalMidpoint){
			if (leftQuadrant){
				index = 0;
			}
			else if (rightQuadrant){
				index = 1;
			}
		}
		else if (extents.maxY < this.maxY && extents.minY > verticalMidpoint){
			if (leftQuadrant){
				index = 2;
			}
			else if (rightQuadrant){
				index = 3;
			}
		}
		return index;
	}

	insert(obj){
		if (this.nodes[0] != null){
			var index = this.getIndex(obj);
			if (index != -1){
				this.nodes[index].insert(obj);

				return;
			}
		}
		this.objects.push(obj);

		if (this.objects.length > this.maxChildren && this.level < this.maxDepth){
			if (this.nodes[0] == null){
				this.splitNode();
			}

			var i = 0;
			while(i < this.objects.length){
				var index = this.getIndex(this.objects[i]);
				if (index != -1){
					this.nodes[index].insert(this.objects[i]);
					this.objects.splice(i, 1);
				}
				else{
					i++;
				}
			}
		}
	}
	retrieve(returnObjects, obj){
		var index = this.getIndex(obj);
		if (index != -1 && this.nodes[0] != null){
			this.nodes[index].retrieve(returnObjects, obj);
		}
        returnObjects.push.apply(returnObjects, this.objects);
		return returnObjects;
	}
}

function checkDistance(obj1,obj2){
	var objX1 = obj1.newX || obj1.x;
	var objY1 = obj1.newY || obj1.y;
	var objX2 = obj2.newX || obj2.x;
	var objY2 = obj2.newY || obj2.y;
	var distance = utils.getMag(objX2 - objX1,objY2 - objY1);
  	distance -= obj1.radius || obj1.height/2;
	distance -= obj2.radius || obj2.height/2;
	if(distance <= 0){
		return true;
	}
	return false;
}

function containsItem(itemList, item){
	for (var i = 0; i < itemList.length; i++){
		if (item == itemList[i]){
			return true;
		}
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

function slowDown(obj,dt,amt){
	obj.velX = obj.velX*(1-amt);
	obj.velY = obj.velY*(1-amt);
	obj.newX = obj.x+obj.velX*dt;
	obj.newY = obj.y+obj.velY*dt;
}

function preventEscape(obj,bound){
	if(obj.newX - obj.radius < bound.x){
		obj.newX = obj.x;
		obj.velX = -obj.velX * 0.25;
	}
	if(obj.newX + obj.radius > bound.x + bound.width){
		obj.newX = obj.x;
		obj.velX = -obj.velX * 0.25;
	}
	if (obj.newY - obj.radius < bound.y){
		obj.newY = obj.y;
		obj.velY = -obj.velY * 0.25;
	}
	if(obj.newY + obj.radius > bound.y + bound.height){
		obj.newY = obj.y;
		obj.velY = -obj.velY * 0.25;
	}
}
