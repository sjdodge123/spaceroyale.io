"use strict";
var fs = require('fs');
var lastFrame = new Date();
var c = require('./config.json');

exports.getRandomInt = function(min,max){
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
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

exports.getMag = function(x,y){
	return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
}

exports.getDT = function(){
	var currentFrame = new Date();
	var dt = currentFrame - lastFrame;
	lastFrame = currentFrame;
	return dt/1000;
}
exports.loadConfig = function(){
    if(process.env.SRIO_ENV == "DEV"){
        var d = require('./devConfig.json');
        if(d.override == true){
            for(var setting in c){
                if(d[setting] != null){
                    c[setting] = d[setting];
                }
            }
        }
    }
    return c;
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
