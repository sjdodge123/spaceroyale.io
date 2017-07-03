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

		this.aggroRange = utils.getRandomInt(c.AIAggroRangeMin,c.AIAggroRangeMax);
		this.aggroRangeSq = this.aggroRange * this.aggroRange;

		this.itemLootRange = 600;
		this.itemLootRangeSq = this.itemLootRange * this.itemLootRange;

		this.killingMaintainDistance = utils.getRandomInt(75,150);
		this.killingMaintainDistanceSq = this.killingMaintainDistance*this.killingMaintainDistance;

		this.maintainDistance = utils.getRandomInt(100,300);
		this.maintainDistanceSq = this.maintainDistance * this.maintainDistance;

		this.mood = this.determineMood();
		this.fleeThreshold = utils.getRandomInt(30,70);

		this.blueBoundRunLimit = 3;
		this.blueBoundTimer = new Date();

		this.closestPlayerShip = null;
		this.closestAsteroid = null;
		this.closestNebula == null;
		this.closestItem = null;
		this.desiredWeapon = '';
		this.ship.isAI = true;
		this.ship.targetDirX = 0;
		this.ship.targetDirY = 0;
		this.ship.AIName = this.generateAIName();
		this.ship.color = this.generateAIColor();
		this.ship.baseColor = this.ship.color;
		this.ship.glowColor = this.ship.color;
	}
	update(active){
		if(active){
			this.gameLoop();
			return;
		}
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
		}
		if(this.closestAsteroid == null){
			this.findClosestAsteroid();
		}
		this.findClosestPlayerShip();

		var moveToTarget = this.determineMoveTarget();
		this.moveToTarget(moveToTarget);

		var fireTarget = this.determineFireTarget();
		if(fireTarget){
			this.faceTarget(fireTarget);
			if (fireTarget.alive){
				this.fireWeapon();
			}
		}
		this.checkHP();
	}

	checkHP(){
		if(this.ship.health < this.fleeThreshold){
			this.mood = "looting";
		} else {
			this.mood = "killing";
		}
	}
	determineMood(){
		var seed = utils.getRandomInt(0,2);
		if(seed == 0){
			return "looting";
		}
		if(seed == 1){
			this.fleeThreshold = this.ship.health - 5;
			return "hiding";
		}
		return "killing";
	}

	determineMoveTarget(){
		if(!this.world.blueBound.inBounds(this.ship)){
			this.blueBoundTimer = new Date();
			return this.world.blueBound;
		}

		if(new Date()-this.blueBoundTimer < this.blueBoundRunLimit*1000){
			return this.world.blueBound;
		}

		if(this.mood == "hiding"){
			this.findClosestNebula();
			if(this.closestNebula != null){
				return this.closestNebula;
			}
		}

		if (this.closestAsteroid != null && !this.closestAsteroid.alive){
			this.findClosestItem();
			this.findClosestAsteroid();
		}

		if (this.closestItem != null && this.closestItem.alive){
			return this.closestItem;
		}

		if(this.mood == "killing"){
			if(this.closestPlayerShip != null && this.closestPlayerShip.alive){
				return this.closestPlayerShip;
			}	
		}
		if (this.closestAsteroid != null && this.closestAsteroid.alive){
			return this.closestAsteroid;
		}
		if(this.closestPlayerShip != null && this.closestPlayerShip.alive){
			return this.closestPlayerShip;
		}

		return this.world.whiteBound;
	}
	determineFireTarget(){
		if(this.mood == "hiding"){
			return;
		}
		if(this.closestPlayerShip != null && this.closestPlayerShip.alive){
			return this.closestPlayerShip;
		}
		if (this.closestAsteroid != null && this.closestAsteroid.alive){
			return this.closestAsteroid;
		}
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
	findClosestNebula(){
		var nebula = null;
		var lastDist2 = Infinity;
		for(var i in this.gameBoard.nebulaList){
			var currentNeb = this.gameBoard.nebulaList[i];
			if (!this.world.blueBound.inBounds(currentNeb)){
				continue;
			}
			var dist2 = utils.getMagSq(this.ship.x,this.ship.y,currentNeb.x,currentNeb.y);
			if(dist2 < lastDist2){
				nebula = currentNeb;
				lastDist2 = dist2;
			}
		}
		this.closestNebula = nebula;
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
			if(dist2 > this.itemLootRangeSq){
				continue;
			}
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

			if(currentShip == this.ship){
				continue;
			}

			if(currentShip.isHiding){
				continue;
			}

			var dist2 = utils.getMagSq(this.ship.x,this.ship.y,currentShip.x,currentShip.y);
			if(this.mood == "looting"){
				if(dist2 > this.aggroRangeSq/1.2){
					continue;
				}
			}
			if(this.mood == "killing"){
				if(dist2 > this.aggroRangeSq*1.2){
					continue;
				}
			}

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

		if(target.isItem || target.isBound){
			this.ship.targetDirX = this.targetDirX;
			this.ship.targetDirY = this.targetDirY;
			return;
		}

		var dist2 = utils.getMagSq(this.ship.x,this.ship.y,target.x,target.y);

		if(this.mood == "killing"){
			if(dist2 > this.killingMaintainDistanceSq){
				this.ship.targetDirX = this.targetDirX;
				this.ship.targetDirY = this.targetDirY;
			}
		}
		if(this.mood == "looting"){
			if(dist2 < this.maintainDistanceSq){
				this.ship.targetDirX = -this.targetDirX;
				this.ship.targetDirY = -this.targetDirY;
			} else{
				this.ship.targetDirX = this.targetDirX;
				this.ship.targetDirY = this.targetDirY;
			}
		}

	}

	generateAIName(){
		var nameInt = utils.getRandomInt(0,c.AINameList.length-1);
		return c.AINameList[nameInt];
	}
	generateAIColor(){
		var colorInt = utils.getRandomInt(0,c.AIColorList.length-1);
		return c.AIColorList[colorInt];
	}
}
