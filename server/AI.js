"use strict";
var utils = require('./utils.js');
var c = utils.loadConfig();

exports.setAIController = function(ship,world,gameBoard){
	return new AIController(ship,world,gameBoard);
};

class AIController{
	constructor(ship,world,gameBoard){
		this.ship = ship;
		this.world = world;
		this.gameBoard = gameBoard;
		this.targetAngle = 0;
		this.rotationSpeed = 15;
		this.targetDirX = 0;
		this.targetDirY = 0;
		this.closestPlayerShip = null;
	}
	update(active){
		this.resetMovement();
		//this.updateRotation();

		if(active){
			this.gameLoop();
			return;
		}
		this.lobbyLoop();
	}
	updateRotation(){
		if(this.ship.angle < this.targetAngle){
			this.ship.angle += this.rotationSpeed;
		}
		if(this.ship.angle > this.targetAngle){
			this.ship.angle -= this.rotationSpeed;
		}
	}

	gameLoop(){

		if(this.closestPlayerShip == null){
			this.findClosestPlayerShip();
		} else{
			this.faceTarget(this.closestPlayerShip);
			this.fireWeapon();
		}

		
		
		//this.faceTarget(this.world.whiteBound);
		//this.fireWeapon();
	}
	lobbyLoop(){
		if(this.closestPlayerShip == null){
			this.findClosestPlayerShip();
		} else{
			this.faceTarget(this.closestPlayerShip);
		}
	}
	findClosestPlayerShip(){
		var playerShip = null;
		var lastDist2 = Infinity;

		for(var i in this.gameBoard.shipList){
			var ship = this.gameBoard.shipList[i];
			if(ship.isAI){
				continue;
			}
			var dist2 = utils.getMagSq(this.ship.x,this.ship.y,ship.x,ship.y);
			if(dist2 < lastDist2){
				playerShip = ship;
				lastDist2 = dist2;
			}
		}
		this.closestPlayerShip = playerShip;
		
	}
	fireWeapon(){
		if(this.alive){
			this.gameBoard.fireWeapon(this.ship);
		}
	}

	faceTarget(target){
		this.targetAngle = (180/Math.PI)*Math.atan2(target.y-this.ship.y,target.x-this.ship.x)-90;
		this.ship.angle = this.targetAngle;
	}
	resetMovement(){
		this.ship.moveBackward = false;
		this.ship.moveForward = false;
		this.ship.turnLeft = false;
		this.ship.turnRight = false;
	}
}
