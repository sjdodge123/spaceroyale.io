"use strict";

class Joystick {
	constructor(x,y){
		this.baseX = x;
		this.baseY = y;
		this.baseRadius = 50;
		this.stickRadius = 100; 
		this.stickX = x;
		this.stickY = y;
		this.touchIdx = null;
		this.pressed = false;
	}

	touchScreenAvailable(){
		return 'createTouch' in document ? true : false;
	}
	onUp(){
		this.pressed = false;
		this.baseX = 0;
		this.baseY = 0;
		this.stickX = 0;
		this.stickY = 0;
	}
	onMove(x,y){
		if(this.pressed = true){
			this.stickX = x;
			this.stickY = y;
		}
	}
	onDown(x,y){
		this.pressed = true;
		this.baseX = x;
		this.baseY = y;
		this.stickX = x;
		this.stickY = y;
	}
}