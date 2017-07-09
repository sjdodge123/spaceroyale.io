'use strict';
var utils = require('./utils.js');
var c = utils.loadConfig();

var listItem = null;
var bullet = null;
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