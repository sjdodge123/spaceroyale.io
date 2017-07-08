'use strict';
var utils = require('./utils.js');
var c = utils.loadConfig();

var props = {};
var listItem = null;
var bullet = null;
var sig = null;

exports.trimBullets = function (bulletList) {
	var list = [];
	for(sig in bulletList){
		bullet = bulletList[sig];
		listItem = [
			bullet.sig,
			bullet.type,
			bullet.x,
			bullet.y,
			bullet.width,
			bullet.height,
			bullet.owner,
			bullet.angle,
		];
		list.push(listItem);
	}
	sig = null;
	bullet = null;
	return list;
}