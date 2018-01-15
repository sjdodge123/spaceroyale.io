"use strict";
var utils = require('./utils.js');
var c = utils.loadConfig();

exports.setAIController = function(ship,world,gameBoard){
	return new AIController(ship,world,gameBoard);
};
exports.setAITradeShipController = function(ts,world,gameBoard){
	return new AITradeShipController(ts,world,gameBoard);
};
exports.setAIDroneController = function(drone,world,gameBoard){
	return new AIDroneController(drone,world,gameBoard);
}


class AIController{
	constructor(ship,world,gameBoard){
		this.agent = ship;
		this.ship = ship;
		this.world = world;
		this.gameBoard = gameBoard;
		this.targetAngle = 0;
		this.rotationSpeed = 15;
		this.targetDirX = 0;
		this.targetDirY = 0;
		this.shipsAlive = 0;

		this.aggroRange = utils.getRandomInt(c.AIAggroRangeMin,c.AIAggroRangeMax);
		this.aggroRangeSqBase = this.aggroRange * this.aggroRange;
		this.aggroRangeSqCurrent = this.aggroRangeSqBase;

		this.itemLootRange = 600;
		this.itemLootRangeSq = this.itemLootRange * this.itemLootRange;

		this.fireDistance = 400;
		this.fireDistanceSqBase = this.fireDistance*this.fireDistance;
		this.fireDistanceSqCurrent = this.fireDistanceSqBase;

		this.maintainDistance = utils.getRandomInt(100,300);
		this.maintainDistanceSqBase = this.maintainDistance * this.maintainDistance;
		this.maintainDistanceSqCurrent = this.maintainDistanceSqBase;

		this.gadgetDistance = utils.getRandomInt(100,300);
		this.gadgetDistanceSqBase = this.gadgetDistance * this.gadgetDistance;
		this.gadgetDistanceSqCurrent = this.gadgetDistanceSqBase;

		this.mood = this.determineBaseMood();

		//When your HP drops below this number, change to Looting
		this.fleeThresholdBase = utils.getRandomInt(20,40);
		this.fleeThresholdCurrent = this.fleeThresholdBase;

		this.blueBoundRunLimit = 3;
		this.blueBoundTimer = new Date();

		this.currentWeapon = null;
		this.behaviorSet = false;
		this.executeGadget = false;
		this.closestPlayerShip = null;
		this.closestAsteroid = null;
		this.closestNebula == null;
		this.closestItem = null;
		this.closestTradeship = null;

		this.fireTarget = null;
		this.fireTargetDistance = 0;

		this.desiredWeapon = this.determineDesiredWeapon();
		this.desiredGadget = this.determineDesiredGadget();
		this.desiredFirstPassive = this.determinePassive();
		this.desiredSecondPassive = this.determinePassive();
		this.ship.changeWeapon(this.desiredWeapon);
		this.ship.changeGadget(this.desiredGadget);
		this.ship.isAI = true;
		this.ship.targetDirX = 0;
		this.ship.targetDirY = 0;
		this.ship.braking = false;
		this.ship.AIName = this.generateAIName();
		this.ship.color = this.generateAIColor();
		this.ship.baseColor = this.ship.color;
		this.ship.glowColor = this.ship.color;
	}
	update(active,shipsAlive){
		if(active && this.ship.alive && this.ship.enabled){
			this.shipsAlive = shipsAlive;
			this.gameLoop();
			return;
		}
	}

	gameLoop(){
		if(this.closestAsteroid == null){
			this.findClosestAsteroid();
		}
		this.findClosestPlayerShip();

		var moveToTarget = this.determineMoveTarget();
		this.moveToTarget(moveToTarget);
		this.fireTarget = this.determineFireTarget();
		if(this.fireTarget){
			this.faceTarget(this.fireTarget);
			if (this.fireTarget.alive){
				this.fireTargetDistance = utils.getMagSq(this.ship.x,this.ship.y,this.fireTarget.x,this.fireTarget.y);
				if(this.fireTargetDistance < this.fireDistanceSqCurrent){
					if(this.currentWeapon != "PhotonCannon" || this.ship.weapon.chargeLevel >= utils.getRandomInt(2,3)){
						this.fireWeapon();
					}
				} else if (this.currentWeapon == "ParticleBeam") {
					this.ship.stopFire();
				}

				if(this.executeGadget == true){
					this.useGadget();
				}
			}
		}
		this.updateMood();
		this.updateBehaviorFromMood();
		this.currentWeapon = this.ship.weapon.name;
		this.updateBehaviorFromWeapon();
		this.updateBehaviorFromGadget();
	}

	updateMood(){
		if(this.playersAlive <= 3){
			this.mood = "aggresive";
			this.behaviorSet = false;
			return;
		}
		if(this.ship.weapon.level > 1 && this.ship.health > this.fleeThresholdCurrent){
			var seed = utils.getRandomInt(0,1);
			if(seed == 0){
				this.mood = "aggresive";
				this.behaviorSet = false;
			} else{
				this.mood = "hiding";
				this.behaviorSet = false;
			}
			return;
		}
		if(this.ship.health < this.fleeThresholdCurrent){
			this.mood = "defensive";
			this.behaviorSet = false;
			return;
		}
		this.mood = "looting";
		this.behaviorSet = false;
	}
	determineBaseMood(){
		var seed = utils.getRandomInt(0,3);
		if(seed == 0){
			return "looting";
		}
		if(seed == 1){
			return "hiding";
		}
		if(seed == 2){
			return "defensive";
		}
		return "aggresive";
	}
	updateBehaviorFromMood(){
		if(this.behaviorSet){
			return;
		}
		this.behaviorSet = true;
		if(this.mood =="aggresive"){
			this.fleeThresholdCurrent = this.fleeThresholdBase*.8;
			this.aggroRangeSqCurrent = this.aggroRangeSqBase*1.5;
			return;
		}
		if(this.mood == "defensive"){
			this.fleeThresholdCurrent = this.fleeThresholdBase*1.2;
			this.aggroRangeSqCurrent = this.aggroRangeSqBase*.5;
			return;
		}
		if(this.mood =="hiding"){
			this.fleeThresholdCurrent = this.ship.health-5;
			this.aggroRangeSqCurrent = this.aggroRangeSqBase*.2;
			return;
		}

		if(this.mood == "looting"){
			this.fleeThresholdCurrent = this.fleeThresholdBase;
			this.aggroRangeSqCurrent = this.aggroRangeSqBase;
			return;
		}
	}

	updateBehaviorFromWeapon(){
		if(this.mood == "hiding"){
			this.maintainDistanceSqCurrent = 0;
			return;
		}
		if(this.currentWeapon == "Blaster"){
			this.maintainDistanceSqCurrent = this.maintainDistanceSqBase;
			this.fireDistanceSqCurrent = this.fireDistanceSqBase;
		}
		if(this.currentWeapon == "PhotonCannon"){
			this.chargeWeapon();
			this.maintainDistanceSqCurrent = this.maintainDistanceSqBase*.2;
			this.fireDistanceSqCurrent = this.fireDistanceSqBase*.2;
		}
		if(this.currentWeapon == "MassDriver"){
			this.maintainDistanceSqCurrent = this.maintainDistanceSqBase*2;
			this.fireDistanceSqCurrent = this.fireDistanceSqBase*2;
		}
		if(this.currentWeapon == "ParticleBeam"){
			if(this.ship.weapon.chargeLevel == 1){
				this.maintainDistanceSqCurrent = this.maintainDistanceSqBase*2;
				this.fireDistanceSqCurrent = this.fireDistanceSqBase*2;
			}
			if(this.ship.weapon.chargeLevel == 2){
				this.maintainDistanceSqCurrent = this.maintainDistanceSqBase;
				this.fireDistanceSqCurrent = this.fireDistanceSqBase;
			}
			if(this.ship.weapon.chargeLevel == 3){
				this.maintainDistanceSqCurrent = this.maintainDistanceSqBase*.2;
				this.fireDistanceSqCurrent = this.fireDistanceSqBase*.2;
			}

		}
	}

	updateBehaviorFromGadget(){
		if(this.fireTarget == null){
			return;
		}
		if(this.desiredGadget == "DirectionalShield"){
			this.executeGadget = true;
		}
		if(this.desiredGadget == "HackingDrone"){
			if( (this.fireTargetDistance < this.gadgetDistanceSqCurrent) && this.fireTarget.alive && this.fireTarget.health < 70){
				this.executeGadget = true;
			}
		}
		if(this.desiredGadget == "PulseWave"){
			if((this.fireTargetDistance < this.gadgetDistanceSqCurrent) && ( (this.fireTarget == this.closestItem) || (this.fireTarget == this.closestPlayerShip) ) ){
				this.executeGadget = true;
			}
		}
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
			if(this.closestNebula == null){
				this.findClosestNebula();
			}
			if(this.closestNebula != null){
				return this.closestNebula;
			}
		}
		if(this.closestTradeship != null && !this.closestTradeship.alive){
			this.findClosestItem();
		}

		if (this.closestAsteroid != null && !this.closestAsteroid.alive){
			this.findClosestItem();
			this.findClosestAsteroid();
		}

		if (this.closestItem != null && this.closestItem.alive){
			return this.closestItem;
		}

		if(this.mood == "aggresive"){
			this.findClosestTradeship();
			if(this.closestTradeship != null && this.closestTradeship.alive){
				return this.closestTradeship;
			}
		}
		if(this.closestPlayerShip != null && this.closestPlayerShip.alive){
			return this.closestPlayerShip;
		}
		if (this.closestAsteroid != null && this.closestAsteroid.alive){
			return this.closestAsteroid;
		}
		return this.world.whiteBound;
	}
	determineFireTarget(){
		if(this.mood == "hiding"){
			return;
		}
		if(this.closestTradeship != null && this.closestTradeship.alive){
			return this.closestTradeship;
		}
		if(this.closestPlayerShip != null && this.closestPlayerShip.alive){
			return this.closestPlayerShip;
		}
		if (this.closestAsteroid != null && this.closestAsteroid.alive){
			return this.closestAsteroid;
		}
	}
	determineDesiredWeapon(){
		switch (utils.getRandomInt(0,3)){
			case 0:{
				return 'Blaster';
			}
			case 1:{
				return 'PhotonCannon';
			}
			case 2:{
				return 'MassDriver';
			}
			case 3:{
				return 'ParticleBeam';
			}
		}
	}
	determineDesiredGadget(){
		switch (utils.getRandomInt(0,2)){
			case 0:{
				return 'DirectionalShield';
			}
			case 1:{
				return 'HackingDrone';
			}
			case 2:{
				return 'PulseWave';
			}
		}
	}
	determinePassive(){
		var passive = utils.getRandomInt(0,Object.keys(c.passivesEnum).length -1);
		if(this.desiredFirstPassive == passive || this.desiredSecondPassive == passive){
			return this.determinePassive();
		}
		this.ship.equipPassive(passive);
		return passive;
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
	findClosestTradeship(){
		var tradeShip = null;
		var lastDist2 = Infinity;
		for(var i in this.gameBoard.tradeShipList){
			var currentTS = this.gameBoard.tradeShipList[i];
			if (!this.world.blueBound.inBounds(currentTS)){
				continue;
			}
			var dist2 = utils.getMagSq(this.ship.x,this.ship.y,currentTS.x,currentTS.y);
			if(dist2 < lastDist2){
				tradeShip = currentTS;
				lastDist2 = dist2;
			}
		}
		this.closestTradeship = tradeShip;
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

			if(dist2 > this.aggroRangeSqCurrent){
				continue;
			}

			if(dist2 < lastDist2){
				playerShip = currentShip;
				lastDist2 = dist2;
			}

		}

		this.closestPlayerShip = playerShip;

	}
	useGadget(){
		this.ship.activateGadget();
		this.executeGadget = false;
	}

	chargeWeapon(){
		this.ship.fire();
	}
	fireWeapon(){
		if(this.ship.alive){
			if(this.currentWeapon == "PhotonCannon"){
				this.ship.stopFire();
			} else{
				this.ship.fire();
			}

		}
	}

	faceTarget(target){
		if(!this.ship.enabled){
			return;
		}
		this.targetAngle = (180/Math.PI)*Math.atan2(target.y-this.ship.y,target.x-this.ship.x)-90;
		this.ship.weapon.angle = this.targetAngle;
	}
	moveToTarget(target){
		if(!this.ship.enabled){
			return;
		}
		this.targetAngle = (180/Math.PI)*Math.atan2(target.y-this.ship.y,target.x-this.ship.x)-90;
		this.targetDirX = Math.cos((this.targetAngle + 90) * Math.PI/180);
		this.targetDirY = Math.sin((this.targetAngle + 90) * Math.PI/180);
		this.ship.braking = false;
		if(target.isItem || target.isBound){
			this.ship.targetDirX = this.targetDirX;
			this.ship.targetDirY = this.targetDirY;
			return;
		}

		var dist2 = utils.getMagSq(this.ship.x,this.ship.y,target.x,target.y);

		if(dist2 < this.maintainDistanceSqCurrent){
			this.ship.targetDirX = -this.targetDirX;
			this.ship.targetDirY = -this.targetDirY;
			this.ship.braking = true;
		} else{
			this.ship.targetDirX = this.targetDirX;
			this.ship.targetDirY = this.targetDirY;
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

class AITradeShipController{
	constructor(ts,world,gameBoard){
		this.agent = ts;
		this.tradeShip = ts;
		this.world = world;
		this.gameBoard = gameBoard;
		this.aggroRange = 800;
		this.aggroRangeSq = this.aggroRange * this.aggroRange;
		this.closestPlayerShip = null;
		this.targetAngle = 0;
	}
	update(active){
		if(active && this.tradeShip.alive){
			if(this.closestPlayerShip == null || !this.closestPlayerShip.alive || this.checkOutOfRange(this.closestPlayerShip)){
				this.findClosestPlayerShip();
			} else{
				this.faceTarget(this.closestPlayerShip);
				this.fireWeapon();
			}
		}
	}

	fireWeapon(){
		this.tradeShip.fireWeapon = true;
	}

	faceTarget(target){
		this.targetAngle = (180/Math.PI)*Math.atan2(target.y-this.tradeShip.y,target.x-this.tradeShip.x)-90;
		this.tradeShip.weapon.angle = this.targetAngle;
	}

	checkOutOfRange(object){
		var dist2 = utils.getMagSq(this.tradeShip.x,this.tradeShip.y,object.x,object.y);
		if(dist2 > this.aggroRangeSq){
			return true;
		}
	}

	findClosestPlayerShip(){
		var playerShip = null;
		var lastDist2 = Infinity;
		for(var i in this.gameBoard.shipList){
			var currentShip = this.gameBoard.shipList[i];
			var dist2 = utils.getMagSq(this.tradeShip.x,this.tradeShip.y,currentShip.x,currentShip.y);

			if(dist2 > this.aggroRangeSq){
				continue;
			}
			if(dist2 < lastDist2){
				playerShip = currentShip;
				lastDist2 = dist2;
			}
		}

		this.closestPlayerShip = playerShip;

	}
 }

 class AIDroneController{
	constructor(drone,world,gameBoard){
		this.agent = drone;
		this.drone = drone;
		this.world = world;
		this.gameBoard = gameBoard;
		this.aggroRange = 300;
		this.aggroRangeSq = this.aggroRange * this.aggroRange;

		this.hackDistance = 75;
		this.hackDistanceSq = this.hackDistance * this.hackDistance;

		this.closestPlayerShip = null;
		this.targetAngle = 0;
	}
	update(active){
		if(this.drone.alive){
			if(this.closestPlayerShip == null || !this.closestPlayerShip.alive || this.checkOutOfRange(this.closestPlayerShip)){
				this.findClosestPlayerShip();
			} else{
				this.faceTarget(this.closestPlayerShip);
			}
		}
	}

	findClosestPlayerShip(){
		var playerShip = null;
		var lastDist2 = Infinity;
		for(var i in this.gameBoard.shipList){
			var currentShip = this.gameBoard.shipList[i];
			if(this.drone.owner == currentShip.id){
				continue;
			}
			var dist2 = utils.getMagSq(this.drone.x,this.drone.y,currentShip.x,currentShip.y);
			if(dist2 > this.aggroRangeSq){
				continue;
			}
			if(dist2 < lastDist2){
				playerShip = currentShip;
				lastDist2 = dist2;
			}
		}
		this.closestPlayerShip = playerShip;
	}

	faceTarget(target){
		this.targetAngle = (180/Math.PI)*Math.atan2(target.y-this.drone.y,target.x-this.drone.x)-90;
		this.drone.angle = this.targetAngle;
	}
	checkOutOfRange(object){
		var dist2 = utils.getMagSq(this.drone.x,this.drone.y,object.x,object.y);

		if(dist2 < this.hackDistanceSq){
			this.drone.hack(object);
			return false;
		}

		if(dist2 > this.aggroRangeSq){
			return true;
		}
	}

}
