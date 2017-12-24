'use strict';
var utils = require('./utils.js');
var c = utils.loadConfig();

var listItem = null;
var bullet = null;
var gadget = null;
var ship = null;
var tradeShip = null;
var nebula = null;
var planet = null;
var asteroid = null;
var prop = null;

exports.shipSpawns = function(shipList){
	var packet = [];
	for(prop in shipList){
		ship = shipList[prop];
		listItem = [
			ship.id,
			ship.x,
			ship.y,
			ship.color,
			ship.weapon.angle,
			ship.weapon.name,
			ship.weapon.level,
			ship.weapon.powerCost,
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	ship = null;
	listItem = null;
	prop = null;
	return packet;
}
exports.appendShip = function(ship){
	var packet = [];
	packet[0] = ship.id;
	packet[1] = ship.x;
	packet[2] = ship.y;
	packet[3] = ship.color;
	packet[4] = ship.weapon.angle;
	packet[5] = ship.weapon.name;
	packet[6] = ship.weapon.level;
	packet[7] = ship.weapon.powerCost;
	packet = JSON.stringify(packet);
	ship = null;
	listItem = null;
	prop = null;
	return packet;
}

exports.spawnAIShips = function(shipList){
	var packet = [];
	for(prop in shipList){
		ship = shipList[prop];
		if(!ship.isAI){
			continue;
		}
		listItem = [
			ship.id,
			ship.x,
			ship.y,
			ship.color,
			ship.weapon.angle,
			ship.weapon.name,
			ship.weapon.level,
			ship.weapon.powerCost,
			ship.AIName,
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	ship = null;
	listItem = null;
	prop = null;
	return packet;
}

exports.sendShipUpdates = function(shipList){
	var packet = [];
	for(prop in shipList){
		ship = shipList[prop];
		listItem = [
			ship.id,
			ship.x,
			ship.y,
			ship.weapon.angle,
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	ship = null;
	listItem = null;
	prop = null;
	return packet;
}

exports.equipItem = function(equipedItem){
	var packet = [];
	packet[0] = equipedItem.owner;
	packet[1] = equipedItem.name;
	packet[2] = equipedItem.level;
	packet[3] = equipedItem.powerCost;
	packet = JSON.stringify(packet);
	return packet;
}

exports.updateItem = function(item,equipedItem){
	var packet = [];
	packet[0] = equipedItem.owner;
	packet[1] = equipedItem.name;
	packet[2] = equipedItem.level;
	packet = JSON.stringify(packet);
	return packet;
}
exports.updateShield = function(shield){
	var packet = [];
	packet[0] = shield.owner;
	packet[1] = shield.level;
	packet[2] = shield.alive;
	packet = JSON.stringify(packet);
	return packet;
}

exports.weaponFired = function(id,weapon,bullets){
	var packet = [];
	packet.push(id);
	packet.push(weapon.name);
	packet.push(weapon.level);
	packet.push(bullets.length);
	for(prop in bullets){
		bullet = bullets[prop];
		listItem = [
			bullet.sig,
			bullet.x,
			bullet.y,
			bullet.angle,
			bullet.speed,
			bullet.width,
			bullet.height,
			bullet.isCrit,
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	listItem = null;
	prop = null;
	bullet = null;
	return packet;
}

exports.gadgetActivated = function(objects){
	if(objects.length){

		//TODO Do some thing for multiple gadget objects
		return;
	}
	var packet = [];
	packet[0] = objects.sig;
	packet[1] = objects.type;
	packet[2] = objects.x;
	packet[3] = objects.y;
	packet[4] = objects.owner;
	packet = JSON.stringify(packet);
	return packet;
}

exports.sendBulletUpdates = function(bulletList){
	var packet = [];
	for(prop in bulletList){
		bullet = bulletList[prop];
		listItem = [
			bullet.sig,
			bullet.x,
			bullet.y,
			bullet.angle,
			bullet.width,
			bullet.height
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	bullet = null;
	listItem = null;
	prop = null;
	return packet;
}
exports.sendGadgetUpdates = function(gadgetList){
	var packet = [];
	for(prop in gadgetList){
		gadget = gadgetList[prop];
		listItem = [
			gadget.sig,
			gadget.x,
			gadget.y,
			gadget.angle,
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	gadget = null;
	listItem = null;
	prop = null;
	return packet;
}


exports.spawnPlanets = function(planetList){
	var packet = [];
	for(prop in planetList){
		planet = planetList[prop];
		listItem = [
			planet.sig,
			planet.x,
			planet.y,
			planet.radius,
			planet.artType,
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	listItem = null;
	prop = null;
	planet = null;
	return packet;
}

exports.spawnAsteroids = function(asteroidList){
	var packet = [];
	for(prop in asteroidList){
		asteroid = asteroidList[prop];
		listItem = [
			asteroid.sig,
			asteroid.x,
			asteroid.y,
			asteroid.spriteAngle,
			asteroid.radius,
			asteroid.artType,
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	listItem = null;
	prop = null;
	asteroid = null;
	return packet;
}

exports.spawnItems = function(items){
	var packet = [];
	for(var i=0;i<items.length;i++){
		listItem = [
			items[i].sig,
			items[i].x,
			items[i].y,
			items[i].name,
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	listItem = null;
	return packet;
}

exports.spawnNebula = function(nebulaList){
	var packet = [];
	for(prop in nebulaList){
		nebula = nebulaList[prop];
		listItem = [
			nebula.sig,
			nebula.x,
			nebula.y,
			nebula.radius,
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	listItem = null;
	prop = null;
	nebula = null;
	return packet;
}

exports.spawnTradeShip = function(tradeShip){
	var packet = []
	packet[0] = tradeShip.sig;
	packet[1] = tradeShip.x;
	packet[2] = tradeShip.y;
	packet[3] = tradeShip.height;
	packet[4] = tradeShip.width;
	packet[5] = tradeShip.angle;
	packet = JSON.stringify(packet);
	return packet;
}

exports.sendTradeShipUpdates = function(tradeShipList){
	var packet = [], trailList = [], sig, trail, trailItem;

	for(prop in tradeShipList){
		tradeShip = tradeShipList[prop];

		for(sig in tradeShip.trailList){
			trail = tradeShip.trailList[sig];
			trailItem = [];
			trailItem.push(sig);
			trailItem.push(trail.x);
			trailItem.push(trail.y);
			trailItem.push(trail.radius);
			trailItem.push(trail.color);
			trailList.push(trailItem);
		}

		listItem = [
			tradeShip.sig,
			tradeShip.x,
			tradeShip.y,
			tradeShip.weapon.angle,
			trailList,
		];
		packet.push(listItem);
	}
	listItem = null;
	prop = null;
	tradeShip = null;

	packet = JSON.stringify(packet);
	return packet;
}

exports.worldResize = function(world){
	var packet = [];
	packet[0] = world.x;
	packet[1] = world.y;
	packet[2] = world.width;
	packet[3] = world.height;

	packet[4] = world.blueBound.x;
	packet[5] = world.blueBound.y;
	packet[6] = world.blueBound.radius;

	packet[7] = world.whiteBound.x;
	packet[8] = world.whiteBound.y;
	packet[9] = world.whiteBound.radius;

	packet = JSON.stringify(packet);
	return packet;
}

exports.shrinkBound = function(bound){
	var packet = [];
	packet[0] = bound.x;
	packet[1] = bound.y;
	packet[2] = bound.radius;
	packet = JSON.stringify(packet);
	return packet;
}

function getUTF8Size (str) {
  var sizeInBytes = str.split('')
    .map(function( ch ) {
      return ch.charCodeAt(0);
    }).map(function( uchar ) {
      return uchar < 128 ? 1 : 2;
    }).reduce(function( curr, next ) {
      return curr + next;
    });

  return sizeInBytes;
};
