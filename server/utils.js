var fs = require('fs');

exports.getRandomInt = function(min,max){
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
};

exports.logToFile = function(fileLoc,content){
	fs.appendFile(__dirname + fileLoc,new Date() + " : " + content + "\r\n");
}