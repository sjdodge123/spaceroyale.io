var bulletList;
var shipList;

exports.broadBase = function(objectArray){
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

exports.buildPhysics = function(_bulletList, _shipList){
	bulletList = _bulletList;
	shipList = _shipList;
}
exports.updatePhysics = function(dt){
	updatePhysics(dt);
}
function checkDistance(obj1,obj2){
	var objX1 = obj1.newX || obj1.x;
	var objY1 = obj1.newY || obj1.y;
	var objX2 = obj2.newX || obj2.x;
	var objY2 = obj2.newY || obj2.y;
	var distance = Math.sqrt(Math.pow((objX2 - objX1),2) + Math.pow((objY2 - objY1),2));
  distance -= obj1.radius || obj1.width;
  distance -= obj2.radius || obj2.width;

	if(distance <= 0){
		return true;
	}
	return false;
}

function updatePhysics(dt){
	updateBullets(dt);
	updateShips(dt);
}

function updateBullets(dt){
	for (var bulletSig in bulletList){
		var bullet = bulletList[bulletSig];
		bullet.velX = Math.cos((bullet.angle+90)*(Math.PI/180))*bullet.speed;
		bullet.velY = Math.sin((bullet.angle+90)*(Math.PI/180))*bullet.speed;
		bullet.newX += bullet.velX * dt;
		bullet.newY += bullet.velY * dt;
	}
}

function updateShips(dt){
	for (var shipSig in shipList){
		var ship = shipList[shipSig];
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
			ship.velX += ship.acel * dirX * dt - .1*ship.velX;
			ship.velY += ship.acel * dirY * dt - .1*ship.velY;
		} else{
			ship.velX += ship.acel * dirX * dt - .5*ship.velX;
			ship.velY += ship.acel * dirY * dt - .5*ship.velY;
		}
		ship.velocity = Math.sqrt(Math.pow(ship.velX, 2) + Math.pow(ship.velY, 2));
		ship.newX += ship.velX * dt;
		ship.newY += ship.velY * dt;
	}
}
