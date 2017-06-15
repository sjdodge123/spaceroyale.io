"use strict";

class Joystick {
	constructor(x,y){
		this.baseX = x;
		this.baseY = y;
		this.stickX = x;
		this.stickY = y;
		this.staticBase = true;
		this.baseRadius = 50;
		this.stickRadius = 30; 
		this.maxPullRadius = 200;
		this.maxPullRadius = this.maxPullRadius*this.maxPullRadius;
		this.dx = 0;
		this.dy = 0;
		this.deadzone = 50;
		this.fireradius = 75;
		this.fireradius2 = this.fireradius*this.fireradius;
		this.distanceSquared  = 0;
		this.touchIdx = null;
		this.pressed = false;
	}

	touchScreenAvailable(){
		return 'createTouch' in document ? true : false;
	}
	checkForFire(){
		if(this.distanceSquared > this.fireradius2){
			return true;
		}
		return false;
	}

	up(){
		if(!this.pressed){
			return false;
		}
		if(this.dy >= 0){
			return false;
		}
		if(Math.abs(this.dy) <= this.deadzone){
			return false;
		}
		if(Math.abs(this.dx) > 2 * Math.abs(this.dy)){
			return false;
		}
		return true;
	}

	down(){
		if(!this.pressed){
			return false;
		}
		if(this.dy <= 0){
			return false;
		}
		if(Math.abs(this.dy) <= this.deadzone){
			return false;
		}
		if(Math.abs(this.dx) > 2 * Math.abs(this.dy)){
			return false;
		}
		return true;
	}

	right(){
		if(!this.pressed){
			return false;
		}
		if(this.dx <= 0){
			return false;
		}
		if(Math.abs(this.dx) <= this.deadzone){
			return false;
		}
		if(Math.abs(this.dy) > 2*Math.abs(this.dx)){
			return false;
		}	
		return true;
	}

	left(){
		if(!this.pressed){
			return false;
		}
		if(this.dx >= 0){
			return false;
		}
		if(Math.abs(this.dx) <= this.deadzone){
			return false;
		}
		if(Math.abs(this.dy) > 2*Math.abs(this.dx)){
			return false;
		}
		return true;
	}

	onUp(){
		this.pressed = false;
		if(this.staticBase){
			this.stickX = this.baseX;
			this.stickY = this.baseY;
		} else{
			this.baseX = 0;
			this.baseY = 0;
			this.stickX = 0;
			this.stickY = 0;
		}
		this.dx = 0;
		this.dy = 0;
	}

	onMove(x,y){
		if(this.pressed = true){
			this.dx = x - this.baseX;
			this.dy = y - this.baseY;
			this.distanceSquared = getMagSquared(this.dx,this.dy);
			if(this.distanceSquared < this.maxPullRadius){
				this.stickX = x;
				this.stickY = y;
			}
		}
		
	}
	onDown(x,y){
		this.pressed = true;
		if(!this.staticBase){
			this.baseX = x;
			this.baseY = y;
		}
		this.stickX = x;
		this.stickY = y;
	}
}