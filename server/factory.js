'use strict';

exports.getWorld = function() {
    return new World(0,0,300,300);
};

exports.getTimer = function(callback,delay){
	return new Timer(callback,delay);
};

class World {
	constructor(x,y,width,height){
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = "blue";
		this.whiteBound = new WhiteBound(width/2,height/2,width*1.2);
		this.blueBound = new BlueBound(width/2,height/2,width*1.2);
		this.center = {x:width/2,y:height/2};		
	}
	inBounds(object){
		if(this.x < object.x + object.width &&
           this.x + this.width > object.x &&
           this.y < object.y + object.height &&
           this.y + this.height > object.y
           ){
           return true;
        }
        return false;
	}
	drawNextBound(){
		this.whiteBound = this._drawWhiteBound();
	}
	_drawWhiteBound(){
		var loc = this.getRandomLoc();
		var whiteBound = new WhiteBound(loc.x,loc.y,this.whiteBound.radius/6);
		if(!this.inBounds(whiteBound)){
			whiteBound = this._drawWhiteBound();
		}
		return whiteBound;
	}
	getRandomLoc(){
		 return {x:Math.floor(Math.random()*(this.width - this.x)) + this.x,y:Math.floor(Math.random()*(this.height - this.y)) + this.y};
	}
	shrinkBound(){
		console.log("Shrinking bounds");
	}
	getWhiteBound(){

	}

}

class Bound{
	constructor(x,y,radius){
		this.x = x;
		this.y = y;
		this.height = radius*2;
		this.width = radius*2;
		this.radius = radius;
	}
	inBounds(object){
		var distance = Math.sqrt(Math.pow((object.x - this.x),2) + Math.pow((object.y - this.y),2));
		if(distance < this.radius){
			return true;
		}
		return false;
	}
}

class WhiteBound extends Bound{
	constructor(x,y,radius){
		super(x,y,radius);
		this.color = "white";
	}
}

class BlueBound extends Bound{
	constructor(x,y,radius){
		super(x,y,radius);
		this.color = "blue";
	}
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
        this.started = new Date()
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
    		this.start();
    	}
    	return this.remaining/1000;
    }

    isRunning(){
    	return this.running;
    }
}