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
	}
	update(active){
		this.resetMovement();
		this.updateRotation();

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
		
	}
	lobbyLoop(){
		this.faceTarget(this.world.whiteBound);
		this.fireWeapon();
	}
	fireWeapon(){
		this.gameBoard.fireWeapon(this.ship);
	}

	faceTarget(target){
		this.targetAngle = (180/Math.PI)*Math.atan2(target.y-this.ship.y,target.x-this.ship.x)-90;;
	}
	resetMovement(){
		this.ship.moveBackward = false;
		this.ship.moveForward = false;
		this.ship.turnLeft = false;
		this.ship.turnRight = false;
	}
}