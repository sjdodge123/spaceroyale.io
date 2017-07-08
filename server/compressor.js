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
			bullet.x,
			bullet.y,
			bullet.width,
			bullet.height,
			bullet.owner,
			bullet.angle,
		];
		list.push(listItem);
	}
	list = JSON.stringify(list);
	sig = null;
	bullet = null;
	//console.log(getUTF8Size(JSON.stringify(bulletList))); 
	//console.log(getUTF8Size(list)); // 75% reduction in payload size;
	return list;
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