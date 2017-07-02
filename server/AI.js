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
		this.aggroRange = 200;
		this.aggroRangeSq = this.aggroRange * this.aggroRange;
		this.closestPlayerShip = null;
		this.closestAsteroid = null;
		this.closestItem = null;
		this.desiredWeapon = '';
		this.ship.isAI = true;
		this.ship.targetDirX = 0;
		this.ship.targetDirY = 0;
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
		if(this.desiredWeapon == ''){
			this.desiredWeapon = this.determineDesiredWeapon();
			console.log(this.desiredWeapon);
		}

		if(this.closestAsteroid == null){
			this.findClosestAsteroid();
		}
		this.findClosestPlayerShip();


		this.moveToTarget(this.determineMoveTarget());
		var fireTarget = this.determineFireTarget();
		this.faceTarget(fireTarget);
		if (fireTarget.alive){
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
	determineMoveTarget(){
		if (this.closestPlayerShip != null && !this.closestPlayerShip.alive){
			this.findClosestPlayerShip();
		}
		if (this.closestAsteroid != null && !this.closestAsteroid.alive){
			this.findClosestItem();
			this.findClosestAsteroid();
		}
		if (this.closestItem != null && this.closestItem.alive){
			return this.closestItem;
		}
		var dist2 = utils.getMagSq(this.ship.x, this.ship.y, this.closestPlayerShip.x, this.closestPlayerShip.y);
		if (dist2 < this.aggroRangeSq){
			return this.closestPlayerShip;
		}
		if (this.closestAsteroid == null){
			return this.closestPlayerShip;
		}
		return this.closestAsteroid;
	}
	determineFireTarget(){
		if (this.closestPlayerShip != null && !this.closestPlayerShip.alive){
			this.findClosestPlayerShip();
		}
		if (this.closestAsteroid != null && !this.closestAsteroid.alive){
			this.findClosestAsteroid();
		}
		var dist2 = utils.getMagSq(this.ship.x, this.ship.y, this.closestPlayerShip.x, this.closestPlayerShip.y);
		if (dist2 < this.aggroRangeSq){
			return this.closestPlayerShip;
		}
		if (this.closestAsteroid == null){
			return this.closestPlayerShip;
		}
		return this.closestAsteroid;
	}
	determineDesiredWeapon(){
		switch (utils.getRandomInt(0,2)){
			case 0:{
				return 'PistolItem';
			}
			case 1:{
				return 'ShotgunItem';
			}
			case 2:{
				return 'RifleItem';
			}
		}
	}
	findClosestAsteroid(){
		var asteroid = null;
		var lastDist2 = Infinity;
		for(var i in this.gameBoard.asteroidList){
			var currentAst = this.gameBoard.asteroidList[i];
			if (!this.world.blueBound.inBounds(currentAst)){
				continue;
			}
			var dist2 = utils.getMagSq(this.ship.x,this.ship.y,currentAst.x,currentAst.y);
			if(dist2 < lastDist2){
				asteroid = currentAst;
				lastDist2 = dist2;
			}
		}
		this.closestAsteroid = asteroid;

	}
	findClosestItem(){
		var item = null;
		var lastDist2 = Infinity;
		for(var i in this.gameBoard.itemList){
			var currentItem = this.gameBoard.itemList[i];
			if (!this.isWorthyItem(currentItem)){
				continue;
			}
			if (!this.world.blueBound.inBounds(currentItem)){
				continue;
			}
			var dist2 = utils.getMagSq(this.ship.x,this.ship.y, currentItem.x, currentItem.y);
			if(dist2 < lastDist2){
				item = currentItem;
				lastDist2 = dist2;
			}
		}
		this.closestItem = item;
	}
	isWorthyItem(item){
		if (item.name == this.desiredWeapon){
			return true;
		}
		if (item.name == 'HPItem' || item.name == 'ShieldItem'){
			return true;
		}
		return false;
	}
	findClosestPlayerShip(){
		var playerShip = null;
		var lastDist2 = Infinity;
		for(var i in this.gameBoard.shipList){
			var currentShip = this.gameBoard.shipList[i];

			if(currentShip.isAI){
				continue;
			}

			var dist2 = utils.getMagSq(this.ship.x,this.ship.y,currentShip.x,currentShip.y);
			if(dist2 < lastDist2){

				playerShip = currentShip;
				lastDist2 = dist2;
			}
		}
		this.closestPlayerShip = playerShip;

	}
	fireWeapon(){
		if(this.ship.alive){
			this.gameBoard.fireWeapon(this.ship);
		}
	}

	faceTarget(target){
		this.targetAngle = (180/Math.PI)*Math.atan2(target.y-this.ship.y,target.x-this.ship.x)-90;
		this.ship.angle = this.targetAngle;
	}
	moveToTarget(target){
		this.targetAngle = (180/Math.PI)*Math.atan2(target.y-this.ship.y,target.x-this.ship.x)-90;
		this.targetDirX = Math.cos((this.targetAngle + 90) * Math.PI/180);
		this.targetDirY = Math.sin((this.targetAngle + 90) * Math.PI/180);

		//perhaps this is bad practice
		//console.log(this.targetDirX);
		this.ship.targetDirX = this.targetDirX;
		this.ship.targetDirY = this.targetDirY;
	}
	resetMovement(){
		this.ship.moveBackward = false;
		this.ship.moveForward = false;
		this.ship.turnLeft = false;
		this.ship.turnRight = false;
	}
}
