"use strict";

var background = new Image();
background.src = 'img/background.jpg';

var shipRedSVG = new Image(500,500);
shipRedSVG.src = 'sprites/ship_red.svg';

var shipGreenSVG = new Image(500,500);
shipGreenSVG.src = 'sprites/ship_green.svg';

var shipMagentaSVG = new Image(500,500);
shipMagentaSVG.src = 'sprites/ship_magenta.svg';

var shipBlueSVG = new Image(500,500);
shipBlueSVG.src = 'sprites/ship_blue.svg';

var tradeShipSVG = new Image();
tradeShipSVG.src ="sprites/trade_ship.svg";

var planetSVG = new Image();
planetSVG.src ="sprites/planet_sheet.svg";

var asteroidSVG = new Image();
asteroidSVG.src ="sprites/asteroid_sheet.svg";

var nebulaSVG = new Image();
nebulaSVG.src ="sprites/nebula_sheet.svg";

var blasterSVG = new Image(200,600);
blasterSVG.src = 'sprites/blaster.svg';

var photonCannonSVG = new Image(200,600);
photonCannonSVG.src = 'sprites/photon_cannon.svg';

var massDriverSVG = new Image(200,600);
massDriverSVG.src = 'sprites/mass_driver.svg';

var particleBeamSVG = new Image(200,600);
particleBeamSVG.src = 'sprites/particle_beam.svg';

var blasterItemSVG = new Image();
blasterItemSVG.src = "sprites/items/blaster_item.svg";

var photonCannonItemSVG = new Image();
photonCannonItemSVG.src = "sprites/items/photon_cannon_item.svg";

var massDriverItemSVG = new Image();
massDriverItemSVG.src = "sprites/items/mass_driver_item.svg";

var shieldItemSVG = new Image();
shieldItemSVG.src = "sprites/items/shield_item.svg";

var healthItemSVG = new Image();
healthItemSVG.src = "sprites/items/health_item.svg";

var overdriveItemSVG = new Image();
overdriveItemSVG.src = "sprites/items/overdrive_item.svg";

var bulletSVG = new Image();
bulletSVG.src = "sprites/bullet_sheet.svg";

var beamSVG = new Image();
beamSVG.src = "sprites/beam_sheet.svg";

var beamDotSVG = new Image();
beamDotSVG.src = "sprites/beamDot_sheet.svg";

class SpriteSheet {
	constructor(image,x,y,frameWidth,frameHeight,rows,columns){
		this.image = image;
		this.x = x;
		this.y = y;
		this.frameWidth = frameWidth;
		this.frameHeight = frameHeight;
		this.frameIndex = [[],[]];
		this.rows = rows;
		this.columns = columns;

		for(var i=0;i<rows;i++){
			this.frameIndex[i] = [];
			for(var j=0;j<columns;j++){
				this.frameIndex[i][j] = {sx:j*frameWidth,sy:i*frameHeight};

			}
		}
		this.XframeIndex = 0;
		this.YframeIndex = 0;
	}
	move(x,y){
		this.x = x;
		this.y = y;
	}
	changeFrame(x,y){
		this.XframeIndex = x;
		this.YframeIndex = y;
	}

	draw(width,height){
		gameContext.drawImage(this.image,this.frameIndex[this.XframeIndex][this.YframeIndex].sx,this.frameIndex[this.XframeIndex][this.YframeIndex].sy,this.frameWidth,this.frameHeight,this.x-(width/2),this.y-(height/2),width,height);
	}
}

var planetSheet = new SpriteSheet(planetSVG,0,0,500,500,1,2);
var asteroidSheet = new SpriteSheet(asteroidSVG,0,0,500,500,3,3);
var nebulaSheet = new SpriteSheet(nebulaSVG,0,0,500,500,1,1);
var tradeShipSheet = new SpriteSheet(tradeShipSVG,0,0,200,600,1,1);
var bulletSheet = new SpriteSheet(bulletSVG,0,0,26,62,1,5);
var beamSheet = new SpriteSheet(beamSVG,0,0,26,62,1,5);
var beamDotSheet = new SpriteSheet(beamDotSVG,0,0,47,47,1,5);

var lastLobbyTime = null;

function drawBackground() {
	gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
}

function drawFlashScreen(){
	gameContext.save();
	gameContext.fillStyle = 'red';
	gameContext.fillRect(0,0,gameCanvas.width,gameCanvas.height);
	gameContext.restore();
}

function drawQuadTree(currentQuad){
	gameContext.save();
	gameContext.translate(currentQuad.minX - myShip.x + camera.xOffset, currentQuad.minY - myShip.y + camera.yOffset);
	gameContext.beginPath();
	gameContext.lineWidth = "6";
	gameContext.strokeStyle = "blue";
	gameContext.rect(0, 0, currentQuad.width, currentQuad.height);
	gameContext.stroke();
	gameContext.restore();

	for (var i = 0; i < currentQuad.nodes.length; i++){
		if (currentQuad.nodes[i] != null){
			drawQuadTree(currentQuad.nodes[i]);
		}
	}
}

function drawText(text,x,y){
	gameContext.save();
	gameContext.fillStyle = 'white';
	gameContext.font="20px Georgia";
	gameContext.fillText(text,x,y);
	gameContext.restore();
}
function drawTextF(text,x,y,color,font){
	gameContext.save();
	gameContext.fillStyle = color;
	gameContext.font=font;
	gameContext.fillText(text,x,y);
	gameContext.restore();
}

function drawFlashingText(text,x,y,color,font,flashColor,timeLeft,playTick){
	if(timeLeft%2 == 1){
		if(playTick){
			playSoundAfterFinish(timerTick);
		}
		drawTextF(text,x,y,flashColor,font);
	} else{
		drawTextF(text,x,y,color,font);
	}
}

//DRAWING HUD UI
function drawHUD(){
	drawJoysticks();
	drawAliveCounter();
	drawWeaponHUD();
	drawKillCounter();
    drawHPCounter();
    drawToast();
    drawPing();
    drawTotalPlayers();
    drawPowerBar();
    drawEventLog();

    if(!camera.inBounds(world.whiteBound)){
		drawBoundArrow();
	}

    if(gameStarted){
    	drawShrinkTimer();
    } else{
    	drawLobbyTimer();
    }

}

function drawJoysticks(){
	if(joystickMovement != null && isTouchScreen){
		gameContext.save();
		gameContext.beginPath();
		gameContext.fillStyle = "rgba(0, 0, 255, 0.3)";
		gameContext.arc(joystickMovement.baseX,joystickMovement.baseY,joystickMovement.baseRadius,0,Math.PI*2,true);
		gameContext.fill();

		gameContext.strokeStyle = "blue";
		gameContext.beginPath();
		gameContext.arc(joystickMovement.stickX,joystickMovement.stickY,joystickMovement.stickRadius,0,Math.PI*2,true);
		gameContext.stroke();

		gameContext.restore();
	}
	if(joystickCamera != null && isTouchScreen){
		gameContext.save();
		gameContext.beginPath();
		gameContext.fillStyle = "rgba(255, 0, 0, 0.3)";
		gameContext.arc(joystickCamera.baseX,joystickCamera.baseY,joystickCamera.baseRadius,0,Math.PI*2,true);
		gameContext.fill();

		/* TODO: Fix touch cooldown display
		if( 1 - (cooldownRemaining/currentWeaponCooldown) >= 1){
			gameContext.strokeStyle = "red";
			gameContext.beginPath();
			gameContext.arc(joystickCamera.baseX,joystickCamera.baseY,joystickCamera.fireradius,0,Math.PI*2,true);
			gameContext.stroke();
		}
		*/
		gameContext.strokeStyle = "red";
		gameContext.beginPath();
		gameContext.arc(joystickCamera.stickX,joystickCamera.stickY,joystickCamera.stickRadius,0,Math.PI*2,true);
		gameContext.stroke();

		gameContext.beginPath();
		gameContext.moveTo(gameCanvas.width/2,gameCanvas.height/2);
		gameContext.lineTo(gameCanvas.width/2+joystickCamera.dx*500,gameCanvas.height/2+joystickCamera.dy*500);
		gameContext.stroke();

		gameContext.restore();
	}
}

function drawAliveCounter(){
	drawText(getShipListCount() + " alive",eventLog.x + eventLog.width-60,eventLog.y-40);
}

function drawWeaponHUD(){
	if(myShip != null){
		var svgscale = .25;
		gameContext.save();
		gameContext.translate(eventLog.x + eventLog.width + 80,eventLog.y+(eventLog.height/2));
		gameContext.rotate(Math.PI/180);
		switch(myShip.weapon.name){
			case "Blaster":{
				gameContext.drawImage(blasterSVG, - blasterSVG.width * svgscale / 2, -  blasterSVG.height * svgscale / 2, blasterSVG.width * svgscale, blasterSVG.height * svgscale);
				break;
			}
			case "PhotonCannon":{
				gameContext.drawImage(photonCannonSVG, - photonCannonSVG.width * svgscale / 2, -  photonCannonSVG.height * svgscale / 2, photonCannonSVG.width * svgscale, photonCannonSVG.height * svgscale);
				break;
			}
			case "MassDriver":{
				gameContext.drawImage(massDriverSVG, - massDriverSVG.width * svgscale / 2, -  massDriverSVG.height * svgscale / 2, massDriverSVG.width * svgscale, massDriverSVG.height * svgscale);
				break;
			}
			case "ParticleBeam":{
				gameContext.drawImage(particleBeamSVG, - particleBeamSVG.width * svgscale / 2, -  particleBeamSVG.height * svgscale / 2, particleBeamSVG.width * svgscale, particleBeamSVG.height * svgscale);
				break;
			}
		}
		gameContext.restore();
		drawText(myShip.weapon.name,eventLog.x + eventLog.width+80-((myShip.weapon.name.length*10)/2),eventLog.y+eventLog.height);
	}

}

function drawKillCounter(){
	drawText("Killed " + myShip.kills,eventLog.x,eventLog.y-40);
}

function drawHPCounter(){
	if(myShip == null){
		return;
	}
	if(myShip.health > 0){
		var color, boost = 0;
		if(myShip.health > config.playerBaseHealth){
			boost = myShip.health-config.playerBaseHealth;
		}
		if(myShip.health > config.playerBaseHealth*.7){
			color = "#1dba34";
		} else if(myShip.health > config.playerBaseHealth*.3){
			color = "yellow";
		} else{
			color = "tomato";
		}
		var totalLength = eventLog.width/2;
		var healthPercent = ((myShip.health-boost*2)/config.playerBaseHealth);
		var healthlength = healthPercent*totalLength;
		gameContext.save();
		gameContext.fillStyle = color;
		gameContext.fillRect(eventLog.x,eventLog.y-30,healthlength,20);
		if(boost > 0){
			var boostLength = (1-healthPercent)*totalLength;
			gameContext.fillStyle = "gold";
			gameContext.fillRect(eventLog.x+healthlength,eventLog.y-30,boostLength,20);
		}
		gameContext.restore();
	}
	drawTextF("Health",eventLog.x+(eventLog.width/4)-30,eventLog.y-15,"#ECF0F1","17px Georgia");
}

function drawPowerBar(){
	if(myShip == null){
		return;
	}
	var boost = 0;
	if(myShip.power > 0){
		if(myShip.power > config.playerBasePower){
			boost = myShip.power-config.playerBasePower;
		}
		var totalLength = eventLog.width/2;
		var powerPercent = ((myShip.power-boost*2)/config.playerBasePower);
		var powerlength = powerPercent*totalLength;
		gameContext.save();
		gameContext.fillStyle = "skyblue";
		gameContext.fillRect(eventLog.x+eventLog.width/2,eventLog.y-30,powerlength,20);
		if(boost > 0){
			var boostLength = (1-powerPercent)*totalLength;
			gameContext.fillStyle = "gold";
			gameContext.fillRect(eventLog.x+eventLog.width/2+powerlength,eventLog.y-30,boostLength,20);
		}
		gameContext.restore();
	}
	drawTextF("Power",eventLog.x+eventLog.width/2+(eventLog.width/4)-30,eventLog.y-15,"#ECF0F1","17px Georgia");
}

function drawToast(){
	if(toastMessage != null){
		drawText(toastMessage,gameCanvas.width/2-(toastMessage.length*5),gameCanvas.height/2+70);
	}
}
function drawTotalPlayers(){
	if(totalPlayers !=null){
		var message = "Players on Server: " + totalPlayers;
		drawTextF(message,gameCanvas.width-(message.length*5),gameCanvas.height - 15,"#e0e0eb","10px Georgia");
	}
}

function drawPing(){
	if(ping != null){
		var message = "Ping: " + ping;
		drawTextF(message,gameCanvas.width-(message.length*5) - 125,gameCanvas.height - 15,"#e0e0eb","10px Georgia");
	}
}


function drawBoundArrow(){
	var dx = world.whiteBound.x - myShip.x;
	var dy = world.whiteBound.y - myShip.y;

	var x, y;
	var arrowPad = 20;
	if (Math.abs(dy/dx) < (camera.yOffset) / (camera.xOffset)){
		if (dx > 0){
			//right edge
			x = 2 * camera.xOffset - arrowPad;
		}
		else{
			//left edge
			x = arrowPad;
		}
		y = (dy/dx) * (x - camera.xOffset) + camera.yOffset;
	}
	else {
		if (dy > 0){
			//bottom edge
			y = 2 * camera.yOffset - arrowPad;
		}
		else{
			//top edge
			y = arrowPad;
		}
		x = (dx/dy) * (y - camera.yOffset) + camera.xOffset;
	}
	var rad = gameCanvas.height/2 * 0.95;
	var angle = Math.atan2(world.whiteBound.y-myShip.y,world.whiteBound.x-myShip.x) + Math.PI/2;

	gameContext.save();
	gameContext.translate(x, y);
	gameContext.rotate(angle);
	gameContext.strokeStyle = myShip.color;
	gameContext.beginPath();
	gameContext.lineWidth = 5;
	gameContext.moveTo(-20,23);
	gameContext.lineTo(0,3);
	gameContext.lineTo(20,23);
	gameContext.stroke();
	gameContext.restore();
}

function drawEventLog(){
	gameContext.save();
	gameContext.globalAlpha = 0.5;
	gameContext.fillStyle = eventLog.backgroundColor;
	gameContext.fillRect(eventLog.x,eventLog.y,eventLog.width,eventLog.height);
	gameContext.fillStyle = eventLog.textColor;
	gameContext.font=	eventLog.textStyle;
	var len = eventLog.printList.length-1;
	if(len != -1){
		for(var i=len;i>=0;i--){
			gameContext.fillText(eventLog.printList[i],eventLog.textX(),eventLog.textY()+(i*eventLog.textSize));
		}
	}
	gameContext.restore();
}

function drawShrinkTimer(){
	if(shrinkTimeLeft > 5){
		drawText(shrinkTimeLeft + " until shrink",eventLog.x + eventLog.width/2-60,eventLog.y-40);
	} else if(shrinkTimeLeft > 0){
		drawFlashingText(shrinkTimeLeft + " until shrink",eventLog.x + eventLog.width/2-60,eventLog.y-40,"white","22px Georgia","red",shrinkTimeLeft);
	} else{
		drawFlashingText("Shrinking bounds..",eventLog.x + eventLog.width/2-60,eventLog.y-40,"red","22px Georgia");
	}
}

function drawLobbyTimer(){
	if(maxLobbyTime == lobbyTimeLeft){
		drawFlashingText("Waiting for more players..",eventLog.x + eventLog.width/2-100,eventLog.y-40,"white","22px Georgia","red",lobbyTimeLeft);
		return;
	}
	if(lobbyTimeLeft > 5){
		drawFlashingText(lobbyTimeLeft + " until start",eventLog.x + eventLog.width/2-40,eventLog.y-40,"white","22px Georgia","red",lobbyTimeLeft);
	} else{
		if(lobbyTimeLeft < .3 && lobbyTimeLeft > 0){
			playSoundAfterFinish(timerEnd);
		}
		drawFlashingText(lobbyTimeLeft + " until start",eventLog.x + eventLog.width/2-40,eventLog.y-40,"red","22px Georgia","white",lobbyTimeLeft,true);
	}
}


//DRAWING OBJECTS RELATIVE TO CAMERA
function drawRelativeObjects(){
	drawBullets();
	drawShips();
	drawAsteroids();
	drawItems();
	drawGadgets();
	drawPlanets();
	drawNebulas();
	drawTradeShips();
	drawWorld();
	drawBounds();
	if (quadTree != null){
		drawQuadTree(quadTree);
	}
}
function drawShip(ship){
	if(ship.shield != null){
		drawShield(ship);
	}

	drawTrail(ship.trail);

	gameContext.save();
	gameContext.translate(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset);
	gameContext.rotate(ship.spriteAngle*Math.PI/180);
	gameContext.shadowColor = ship.color;
	gameContext.shadowOffsetX = 1;
	gameContext.shadowOffsetY = 1;
	gameContext.shadowBlur = 16;

	var shipSVG;
	switch (ship.color){
		default: {
			shipSVG = shipRedSVG;
			break;
		}
		case 'red':{
			shipSVG = shipRedSVG;
			break;
		}
		case 'green':{
			shipSVG = shipGreenSVG;
			break;
		}
		case '#ff00bf':{
			shipSVG = shipMagentaSVG;
			break;
		}
		case '#66b3ff':{
			shipSVG = shipBlueSVG;
			break;
		}
	}
	gameContext.drawImage(shipSVG, -ship.radius, -ship.radius, 2*ship.radius, 2*ship.radius);
	gameContext.restore();

	drawWeapon(ship);
	if(ship.AIName != null || (playerList[ship.id] != null)){
		var name = ship.AIName || playerList[ship.id]+ "";
		drawTextF(name,ship.x-myShip.x+camera.xOffset-(name.length*3),ship.y-myShip.y+camera.yOffset-35,ship.color,"12px Helvetica");
	}
	if(ship != myShip){
		drawHealthBar(ship);
	}
}

function drawHealthBar(ship){
	gameContext.save();
	if(ship.health > 70){
		gameContext.fillStyle = "#1dba34";
	}else if(ship.health > 30){
		gameContext.fillStyle = "yellow";
	} else {
		gameContext.fillStyle = "tomato";
	}
	gameContext.fillRect(ship.x-myShip.x+camera.xOffset-25,ship.y-myShip.y+camera.yOffset-30,(ship.health/100)*50,5);
	gameContext.restore();
}

function drawWeapon(ship){
	var shipDim = ship.radius || ship.width/4;
	var svgscale = 2 * shipDim / shipRedSVG.width;
	gameContext.save();
	gameContext.translate(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset);
	gameContext.rotate((ship.weapon.angle + 180)*Math.PI/180);
	switch(ship.weapon.name){
		case "Blaster":{
			gameContext.drawImage(blasterSVG, - blasterSVG.width * svgscale / 2, -  blasterSVG.height * svgscale / 2, blasterSVG.width * svgscale, blasterSVG.height * svgscale);
			break;
		}
		case "PhotonCannon":{
			gameContext.drawImage(photonCannonSVG, - photonCannonSVG.width * svgscale / 2, -  photonCannonSVG.height * svgscale / 2, photonCannonSVG.width * svgscale, photonCannonSVG.height * svgscale);
			break;
		}
		case "MassDriver":{
			gameContext.drawImage(massDriverSVG, - massDriverSVG.width * svgscale / 2, -  massDriverSVG.height * svgscale / 2, massDriverSVG.width * svgscale, massDriverSVG.height * svgscale);
			break;
		}
		case "ParticleBeam":{
			gameContext.drawImage(particleBeamSVG, - particleBeamSVG.width * svgscale / 2, -  particleBeamSVG.height * svgscale / 2, particleBeamSVG.width * svgscale, particleBeamSVG.height * svgscale);
			break;
		}
	}

	gameContext.restore();

	if(ship.weapon.chargeLevel > 0){

		gameContext.save();
		for(var i=0;i<ship.weapon.chargeLevel;i++){
				gameContext.beginPath();
				gameContext.fillStyle = ship.color;
				gameContext.arc((i * 15) + ship.x-myShip.x+camera.xOffset - 15,ship.y-myShip.y+camera.yOffset+35,5,0,Math.PI*2,true);
				gameContext.fill();
		}
		gameContext.restore();
	}

}
function drawShield(ship){
	gameContext.save();
	switch(ship.shield.level){
		case 1:{
			gameContext.strokeStyle = config.shield1Color;
			break;
		}
		case 2:{
			gameContext.strokeStyle = config.shield2Color;
			break;
		}
		case 3:{
			gameContext.strokeStyle = config.shield3Color;
			break;
		}

	}
	gameContext.beginPath();
	gameContext.arc(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset,config.shieldRadius,0,Math.PI*2,true);
	gameContext.stroke();
	gameContext.restore();
}

function drawAsteroid(asteroid){
	gameContext.save();
	gameContext.translate(asteroid.x-myShip.x+camera.xOffset,asteroid.y-myShip.y+camera.yOffset);
	gameContext.rotate(asteroid.angle*Math.PI/180);
	asteroidSheet.move(0,0);

	if(asteroid.health >= config.asteroidBaseHealth * 0.80){
		asteroidSheet.changeFrame(0,asteroid.artType);
	}
	else if(asteroid.health < config.asteroidBaseHealth*.40){
		asteroidSheet.changeFrame(2,asteroid.artType);
	}
	else{
		asteroidSheet.changeFrame(1,asteroid.artType);
	}
	asteroidSheet.draw(asteroid.radius*2,asteroid.radius*2);
	gameContext.restore();
}

function drawItem(item){
	if(item.flash == true){
		return;
	}
	gameContext.save();

	switch(item.name){
		default:{
			gameContext.beginPath();
			gameContext.fillStyle = "red";
			gameContext.arc(item.x-myShip.x+camera.xOffset,item.y-myShip.y+camera.yOffset,item.radius,0,Math.PI*2,true);
			gameContext.fill();
			gameContext.beginPath();
			gameContext.strokeStyle = "white";
			gameContext.lineWidth=2;
		    gameContext.arc(item.x-myShip.x+camera.xOffset,item.y-myShip.y+camera.yOffset,item.radius,0,Math.PI*2,true);
		    gameContext.stroke();
			break;
		}
		case "OverdriveItem":{
			gameContext.drawImage(overdriveItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}

		case "BlasterItem":{
			gameContext.drawImage(blasterItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "PhotonCannonItem":{
			gameContext.drawImage(photonCannonItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "MassDriverItem":{
			gameContext.drawImage(massDriverItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "HealthAttribute":{
			gameContext.drawImage(healthItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "ShieldItem":{
			gameContext.drawImage(shieldItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
	}
    gameContext.restore();
}

function drawGadget(gadget){
	var color;
	gameContext.save();
	if(shipList[gadget.owner] == null){
		color = '#C0C0C0';
	} else{
		color = shipList[gadget.owner].color;
	}

	switch(gadget.type){
		case "Pulse":{
			gameContext.beginPath();
			gameContext.lineWidth = 3;
			gameContext.strokeStyle = "red";
			gameContext.arc(gadget.x-myShip.x+camera.xOffset,gadget.y-myShip.y+camera.yOffset,gadget.radius,0,Math.PI*2,true);
			gameContext.stroke();
			break;
		}
		case "Drone":{
			gameContext.beginPath();
			gameContext.lineWidth = 1;
			gameContext.fillStyle = "orange";
			gameContext.arc(gadget.x-myShip.x+camera.xOffset,gadget.y-myShip.y+camera.yOffset,gadget.radius,0,Math.PI*2,true);
			gameContext.fill();
			break;
		}
		case "ForceShield":{
			gameContext.beginPath();
			gameContext.lineWidth = 5;
			gameContext.strokeStyle = color;
			//gameContext.arc(gadget.x-myShip.x+camera.xOffset,gadget.y-myShip.y+camera.yOffset,config.forceShieldRadius,0, Math.PI*2,true);
			gameContext.arc(gadget.x-myShip.x+camera.xOffset,gadget.y-myShip.y+camera.yOffset,config.forceShieldDrawRadius,((gadget.angle + 90)*Math.PI/180) + Math.PI/4,((gadget.angle + 90)*Math.PI/180) - Math.PI/4,true);
			gameContext.stroke();
			break;
		}
		default:{
			gameContext.beginPath();
			gameContext.lineWidth = 3;
			gameContext.strokeStyle = "red";
			gameContext.arc(gadget.x-myShip.x+camera.xOffset,gadget.y-myShip.y+camera.yOffset,50,0,Math.PI*2,true);
			gameContext.stroke();
			break;
		}
	}
	gameContext.restore();
}

function drawPlanet(planet){
	gameContext.save();
	planetSheet.move(planet.x-myShip.x+camera.xOffset,planet.y-myShip.y+camera.yOffset);
	planetSheet.changeFrame(0,planet.artType);
	planetSheet.draw(planet.radius*2,planet.radius*2);
	gameContext.restore();
}

function drawNebula(nebula){
	gameContext.save();
	nebulaSheet.move(nebula.x-myShip.x+camera.xOffset,nebula.y-myShip.y+camera.yOffset);
	nebulaSheet.draw(nebula.radius*2,nebula.radius*2);
	gameContext.restore();
}

function drawTradeShip(tradeShip){
	gameContext.save();
	gameContext.translate(tradeShip.x-myShip.x+camera.xOffset,tradeShip.y-myShip.y+camera.yOffset);
	gameContext.rotate((tradeShip.angle+90)*Math.PI/180);
	tradeShipSheet.move(0,0);
	tradeShipSheet.draw(tradeShip.height,tradeShip.width);
    gameContext.restore();
    if(tradeShip.weapon != null){
    	drawWeapon(tradeShip);
    }
}

function drawTradeShipTrail(circle){
	gameContext.save();
	gameContext.beginPath();
	gameContext.lineWidth = 3;
	gameContext.strokeStyle = circle.color;
	gameContext.arc(circle.x-myShip.x+camera.xOffset,circle.y-myShip.y+camera.yOffset,circle.radius,0,Math.PI*2,true);
	gameContext.stroke();
	gameContext.restore();
}

function drawBullet(bullet){
	var color;
	if(shipList[bullet.owner] == null){
		color = '#C0C0C0';
	} else{
		color = shipList[bullet.owner].color;
	}

	switch(bullet.weaponName){
		default:{
			drawTrail(bullet.trail);

			switch(color){
				default: {
					bulletSheet.changeFrame(0,4);
					break;
				}
				case 'red':{
					bulletSheet.changeFrame(0,1);
					break;
				}
				case 'green':{
					bulletSheet.changeFrame(0,2);
					break;
				}
				case '#ff00bf':{
					bulletSheet.changeFrame(0,3);
					break;
				}
				case '#66b3ff':{
					bulletSheet.changeFrame(0,0);
					break;
				}
			}

			gameContext.save();
			gameContext.translate(bullet.x-myShip.x+camera.xOffset,bullet.y-myShip.y+camera.yOffset);
			gameContext.rotate(bullet.angle*Math.PI/180);
			bulletSheet.move(0,0);
			bulletSheet.draw(2*bullet.width, 2*bullet.height);
			/*
			gameContext.fillStyle = color;
			gameContext.fillRect(-bullet.width/2,-bullet.height/2,bullet.width,bullet.height);
			*/
			gameContext.restore();
			break;
			}

		case "ParticleBeam":{
			switch(color){
				default: {
					beamSheet.changeFrame(0,4);
					beamDotSheet.changeFrame(0,4);
					break;
				}
				case 'red':{
					beamSheet.changeFrame(0,1);
					beamDotSheet.changeFrame(0,1);
					break;
				}
				case 'green':{
					beamSheet.changeFrame(0,2);
					beamDotSheet.changeFrame(0,2);
					break;
				}
				case '#ff00bf':{
					beamSheet.changeFrame(0,3);
					beamDotSheet.changeFrame(0,3);
					break;
				}
				case '#66b3ff':{
					beamSheet.changeFrame(0,0);
					beamDotSheet.changeFrame(0,0);
					break;
				}
			}

			gameContext.save();
			gameContext.translate(bullet.x-myShip.x+camera.xOffset,bullet.y-myShip.y+camera.yOffset);
			gameContext.rotate(bullet.angle*Math.PI/180);
			beamSheet.move(0,0);
			beamSheet.draw(bullet.width, bullet.height);

			gameContext.translate(0,bullet.height/2);
			beamDotSheet.move(0,0);
			beamDotSheet.draw(bullet.width*2, bullet.width*2);
			gameContext.restore();
			break;
		}
	}

}
function drawTrail(trail){

	switch(trail.type){
		case 'circle':{
			var minRadius = 0.5 * trail.lineWidth;
			var rDiff = trail.lineWidth -  minRadius;
			for (var i = 0; i < trail.length; i++){
				var point = trail.vertices[i];
				var alpha = Math.round(trail.alphaStart * 100 * (trail.length - 1 - i) / (trail.length - 1)) / 100; //note that there are trail.length - 1 line segments. note, won't round up on .005
				var nextColor = trail.colorPrefix + alpha.toString() + ')';
				var circleRadius = minRadius + rDiff * (trail.length - 1 - i) / (trail.length - 1);
				gameContext.save();
				gameContext.beginPath();
				gameContext.arc(point.x - myShip.x + camera.xOffset, point.y - myShip.y + camera.yOffset, circleRadius, 0, Math.PI * 2, true);
				gameContext.fillStyle = nextColor;
				gameContext.fill();
				gameContext.restore();
			}
			break;
		}
		case 'line':{
			gameContext.save();
			gameContext.beginPath();
			gameContext.lineWidth = trail.lineWidth;
			gameContext.moveTo(trail.vertices[0].x - myShip.x + camera.xOffset,trail.vertices[0].y - myShip.y + camera.yOffset);
			var previousColor = trail.initialColor;
			for (var i = 1; i < trail.length; i++){
				var lastPoint = trail.vertices[i-1];
				var point = trail.vertices[i];
				var gradient = gameContext.createLinearGradient(lastPoint.x - myShip.x + camera.xOffset, lastPoint.y - myShip.y + camera.yOffset, point.x - myShip.x + camera.xOffset, point.y - myShip.y + camera.yOffset);
				var alpha = Math.round(trail.alphaStart * 100 * (trail.length - 1 - i) / (trail.length - 1)) / 100; //note that there are trail.length - 1 line segments. note, won't round up on .005
				var nextColor = trail.colorPrefix + alpha.toString() + ')';
				gradient.addColorStop(0, previousColor); //start color
				gradient.addColorStop(1, nextColor); //end color
				previousColor = nextColor;
				gameContext.strokeStyle = gradient;
				gameContext.lineTo(point.x - myShip.x + camera.xOffset, point.y - myShip.y + camera.yOffset);
				gameContext.stroke();
			}
			gameContext.restore();
			break;
		}
	}

}

function drawWorld(){
	if(world != null){
		gameContext.save();
		gameContext.beginPath();
        gameContext.strokeStyle = "orange";
        gameContext.rect(world.x-myShip.x+camera.xOffset,world.y-myShip.y+camera.yOffset,world.width,world.height);
        gameContext.stroke();
        gameContext.restore();
	}
}

function drawBounds(){
	if(world.whiteBound != null){
		gameContext.save();
		gameContext.beginPath();
		gameContext.lineWidth = 3;
		gameContext.strokeStyle = "white";
		gameContext.arc(world.whiteBound.x-myShip.x+camera.xOffset,world.whiteBound.y-myShip.y+camera.yOffset,world.whiteBound.radius,0,Math.PI*2,true);
		gameContext.stroke();
		gameContext.restore();
	}
	if(world.blueBound != null){
		gameContext.save();
		gameContext.beginPath();
		gameContext.lineWidth = 3;
		gameContext.strokeStyle = "blue";
		gameContext.arc(world.blueBound.x-myShip.x+camera.xOffset,world.blueBound.y-myShip.y+camera.yOffset,world.blueBound.radius,0,Math.PI*2,true);
		gameContext.stroke();
		gameContext.restore();
	}
}


function drawShips(){
	for(var shipKey in shipList){
		var ship = shipList[shipKey];
		if(ship == null){
			continue;
		}
		if(shipKey == myID){
			drawShip(ship);
			continue;
		}
		if(camera.inBounds(ship)){
			drawShip(ship);
		}
	}
}

function drawAsteroids(){
	for(var sig in asteroidList){
		if(asteroidList[sig] == null){
			continue;
		}
		if(camera.inBounds(asteroidList[sig])){
			drawAsteroid(asteroidList[sig]);
		}

	}
}

function drawItems(){
	for(var sig in itemList){
		if(itemList[sig] == null){
			continue;
		}
		if(camera.inBounds(itemList[sig])){
			drawItem(itemList[sig]);
		}

	}
}

function drawGadgets(){
	for(var sig in gadgetList){
		if(gadgetList[sig] == null){
			continue;
		}
		if(camera.inBounds(gadgetList[sig])){
			drawGadget(gadgetList[sig]);
		}
	}
}



function drawPlanets(){
	for(var sig in planetList){
		if(planetList[sig] == null){
			continue;
		}
		if(camera.inBounds(planetList[sig])){
			drawPlanet(planetList[sig]);
		}

	}
}

function drawNebulas(){
	for(var sig in nebulaList){
		if(nebulaList[sig] == null){
			continue;
		}
		if(camera.inBounds(nebulaList[sig])){
			drawNebula(nebulaList[sig]);
		}

	}
}
function drawTradeShips(){
	for(var sig in tradeShipList){
		if(tradeShipList[sig] == null){
			continue;
		}
		for(var trailSig in tradeShipList[sig].trailList){
			var circle = tradeShipList[sig].trailList[trailSig];
			if(circle != null){
				if(camera.inBounds(circle)){
					drawTradeShipTrail(circle);
				}
			}
		}
		if(camera.inBounds(tradeShipList[sig])){
			drawTradeShip(tradeShipList[sig]);
		}
	}
}

function drawBullets(){
	for(var sig in bulletList){
		if(bulletList[sig] == null){
			continue;
		}

		if(camera.inBounds(bulletList[sig])){
			drawBullet(bulletList[sig]);
		}
	}
}
