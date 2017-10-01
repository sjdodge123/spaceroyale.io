"use strict";
var fs = require('fs');
var lastFrame = new Date();
var c = require('./config.json');

if(process.env.SRIO_ENV == "DEV"){
    console.log("Detected DEV environment");
    var d = require('./devConfig.json');
    if(d.override == true){
        for(var setting in c){
            if(d[setting] != null){
                c[setting] = d[setting];
            }
        }
    }
}
loadDBInfo();


exports.getRandomInt = function(min,max){
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.logToFile = function(fileLoc,content){
	fs.appendFile(__dirname + fileLoc,new Date() + " : " + content + "\r\n");
}

exports.logError = function(content){
    fs.appendFile(__dirname+ "logs/errors.txt",new Date() + " : " + content + "\r\n");
}

exports.getTimer = function(callback,delay){
	return new Timer(callback,delay);
}

exports.getMagSq = function(x1, y1, x2, y2){
	return Math.pow(x2-x1,2) + Math.pow(y2-y1, 2);
}

exports.getMag = function(x,y){
	return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
}

exports.dotProduct = function(a, b){
    return a.x * b.x + a.y * b.y;
}

exports.getDT = function(){
	var currentFrame = new Date();
	var dt = currentFrame - lastFrame;
	lastFrame = currentFrame;
	return dt/1000;
}
exports.loadConfig = function(){
    return c;
}

function loadDBInfo(){
    if(process.env.SRIO_DB_HOST == null){
        console.log("Could not connect to database. SRIO_DB_HOST not set.");
        return;
    }
    if(process.env.SRIO_DB_NAME == null){
        console.log("Could not connect to database. SRIO_DB_NAME not set.");
        return;
    }
    if(process.env.SRIO_DB_USER == null){
        console.log("Could not connect to database. SRIO_DB_USER not set.");
        return;
    }
    if(process.env.SRIO_DB_PASS == null){
        console.log("Could not connect to database. SRIO_DB_PASS not set.");
        return;
    }
    c.sqlinfo.host = process.env.SRIO_DB_HOST;
    c.sqlinfo.database = process.env.SRIO_DB_NAME;
    c.sqlinfo.user = process.env.SRIO_DB_USER;
    c.sqlinfo.password = process.env.SRIO_DB_PASS;
}

class Timer {
	constructor(callback,delay){
		this.callback = callback;
		this.delay = delay;
		this.running = false;
		this.started = null;
		this.remaining = delay;
		this.id = null;
		this.start();
	}
	start() {
        this.running = true;
        this.started = new Date();
        this.id = setTimeout(this.callback, this.remaining);
    }

    pause(){
    	this.running = false;
    	clearTimeout(this.id);
    	this.remaining -= new Date() - this.started;
    }
    getTimeLeft(){
    	if(this.running){
    		this.pause();
	        if(this.remaining < 0){
	      		return 0;
	      	}
    		this.start();
    	}

    	return this.remaining/1000;
    }
    reset(){
    	this.running = false;
    	clearTimeout(this.id);
    	this.remaining = this.delay;
    	this.started = null;
    }
    isRunning(){
    	return this.running;
    }
}
