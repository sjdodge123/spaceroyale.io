'use strict';
var utils = require('./utils.js');
var c = utils.loadConfig();

var listItem = null;
var bullet = null;
var ship = null;
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
			ship.weapon.cooldown,
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
	packet[7] = ship.weapon.cooldown;
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
			ship.weapon.cooldown,
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

exports.equipItem = function(item,equipedItem){
	var packet = [];
	packet[0] = equipedItem.owner;
	packet[1] = item.name;
	packet[2] = equipedItem.level;
	packet = JSON.stringify(packet);
	return packet;
}

exports.updateItem = function(item,equipedItem){
	var packet = [];
	packet[0] = equipedItem.owner;
	packet[1] = item.name;
	packet[2] = equipedItem.level;
	packet = JSON.stringify(packet);
	return packet;
}

exports.weaponFired = function(ship,weapon,bullets){
	var packet = [];
	packet.push(ship.id);
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
		];
		packet.push(listItem);
	}
	packet = JSON.stringify(packet);
	listItem = null;
	prop = null;
	bullet = null;
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

exports.spawnItem = function(item){
	var packet = [];
	packet[0] = item.sig;
	packet[1] = item.x;
	packet[2] = item.y;
	packet[3] = item.name;
	packet = JSON.stringify(packet);
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