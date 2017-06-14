"use strict";

class Joystick {
	constructor(x,y){
		this.baseX = x;
		this.baseY = y;
		this.baseRadius = 50;
		this.stickRadius = 100; 
		this.stickX = x;
		this.stickY = y;
		this.dx = 0;
		this.dy = 0;
		this.deadzone = 100;
		this.fireradius = 125;
		this.fireradius2 = this.fireradius*this.fireradius;
		this.touchIdx = null;
		this.pressed = false;
	}

	touchScreenAvailable(){
		return 'createTouch' in document ? true : false;
	}
	checkForFire(){
		var d2 = getMagSquared(this.dx,this.dy);
		if(d2 > this.fireradius2){
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
		this.baseX = 0;
		this.baseY = 0;
		this.stickX = 0;
		this.stickY = 0;
		this.dx = 0;
		this.dy = 0;
	}
	onMove(x,y){
		if(this.pressed = true){
			this.stickX = x;
			this.stickY = y;
		}
		this.dx = this.stickX - this.baseX;
		this.dy = this.stickY - this.baseY;
	}
	onDown(x,y){
		this.pressed = true;
		this.baseX = x;
		this.baseY = y;
		this.stickX = x;
		this.stickY = y;
	}
}