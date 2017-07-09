'use strict';
var utils = require('./utils.js');
var c = utils.loadConfig();

var listItem = null;
var bullet = null;
var nebula = null;
var planet = null;
var asteroid = null;
var prop = null;

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