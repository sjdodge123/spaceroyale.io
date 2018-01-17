"use strict";

var background = new Image();
background.src = 'img/background.jpg';

var shipRedSVG = new Image(150,1200);
shipRedSVG.src = 'sprites/ship_red.svg';

var shipGreenSVG = new Image(150,1200);
shipGreenSVG.src = 'sprites/ship_green.svg';

var shipMagentaSVG = new Image(150,1200);
shipMagentaSVG.src = 'sprites/ship_magenta.svg';

var shipBlueSVG = new Image(150,1200);
shipBlueSVG.src = 'sprites/ship_blue.svg';

var cannonSVG = new Image(300,1120);
cannonSVG.src = 'sprites/blaster_wip.svg';

var explosionSVG = new Image(500,4000);
explosionSVG.src = 'sprites/explosion_sheet.svg';

var pulseSVG = new Image(200, 1200);
pulseSVG.src = 'sprites/pulse_wip3.svg';

var popSVG = new Image(500,4000);
popSVG.src = 'sprites/pop_sheet.svg';

var tradeShipSVG = new Image();
tradeShipSVG.src ="sprites/trade_ship.svg";

//var planetSVG = new Image();
//planetSVG.src ="sprites/planet_sheet.svg";

var planetSVG = new Image();
planetSVG.src ="sprites/station_sheet.svg";

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

var weaponAttributeSVG = new Image();
weaponAttributeSVG.src = "sprites/items/shield_item.svg";

var healthAttributeSVG = new Image();
healthAttributeSVG.src = "sprites/items/health_item.svg";

var speedAttributeSVG = new Image();
speedAttributeSVG.src = "sprites/items/overdrive_item.svg";

var bulletSVG = new Image(260,350);
//bulletSVG.src = "sprites/bullet_sheet.svg";
bulletSVG.src = "sprites/bullet_anim.svg";

var bulletCritSVG = new Image(260,350);
bulletCritSVG.src = "sprites/crit_anim_wip2.svg";

var beamSVG = new Image();
beamSVG.src = "sprites/beam_sheet.svg";

var beamDotSVG = new Image();
beamDotSVG.src = "sprites/beamDot_sheet.svg";

class SpriteSheet {
	constructor(image,x,y,frameWidth,frameHeight,rows,columns, loopAnimation){
		this.image = image;
		this.x = x;
		this.y = y;
		this.frameWidth = frameWidth;
		this.frameHeight = frameHeight;
		this.frameIndex = [[],[]];
		this.rows = rows;
		this.columns = columns;

		this.frameRate = 24;
		this.ticksPerFrame = 1 / this.frameRate;
		this.ticks = 0;
		this.loopAnimation = loopAnimation;
		this.animationComplete = false;

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
	update(dt){
		this.ticks += dt/1000;
		if (this.ticks > this.ticksPerFrame){
			this.ticks = 0;
			if (this.YframeIndex < this.columns - 1){
				this.YframeIndex += 1;
				return;
			}
			if (this.loopAnimation){
				this.YframeIndex = 0;
			}
			else{
				this.animationComplete = true;
			}
		}
	}
	draw(width,height){
		gameContext.drawImage(this.image,this.frameIndex[this.XframeIndex][this.YframeIndex].sx,this.frameIndex[this.XframeIndex][this.YframeIndex].sy,this.frameWidth,this.frameHeight,this.x-(width/2),this.y-(height/2),width,height);
	}
}

var planetSheet = new SpriteSheet(planetSVG,0,0,500,500,1,2,false);
var asteroidSheet = new SpriteSheet(asteroidSVG,0,0,500,500,3,3,false);
var nebulaSheet = new SpriteSheet(nebulaSVG,0,0,500,500,1,1,false);
var tradeShipSheet = new SpriteSheet(tradeShipSVG,0,0,200,600,1,1,false);
//var bulletSheet = new SpriteSheet(bulletSVG,0,0,26,62,1,5,false);
var beamSheet = new SpriteSheet(beamSVG,0,0,26,62,1,5,false);
var beamDotSheet = new SpriteSheet(beamDotSVG,0,0,47,47,1,5,false);
var shipBlueSheet = new SpriteSheet(shipBlueSVG, 0, 0, 160, 160, 1, 16,true);
var shipMagentaSheet = new SpriteSheet(shipMagentaSVG, 0, 0, 160, 160, 1, 16,true);
var shipGreenSheet = new SpriteSheet(shipGreenSVG, 0, 0, 160, 160, 1, 16,true);
var shipRedSheet = new SpriteSheet(shipRedSVG, 0, 0, 160, 160, 1, 16,true);
var lastLobbyTime = null;

class FloatingText {
	constructor(font,acelX,acelY,duration){
		this.font = "bold 25px Verdana";
		this.critFont = "bold 35px Verdana";
		this.verticalIncrease = acelX || -5;
		this.horizontalIncrease = acelY || -1;
		this.duration = duration || 600;
		this.critDuration = this.duration + this.duration*.75;
		this.critVerticalIncrease = this.verticalIncrease - this.verticalIncrease*.5;
		this.critHorizontalIncrease = this.horizontalIncrease + this.horizontalIncrease*2;
		this.textList = [];
	}
	add(text,x,y){
		var fto = {};
		fto.text = text;
		fto.x = x;
		fto.y = y;
		fto.font = this.font;
		fto.start = Date.now();
		this.textList.unshift(fto);
	}
	addCrit(text,x,y){
		var fto = {};
		fto.text = text;
		fto.x = x;
		fto.y = y;
		fto.isCrit = true;
		fto.font = this.critFont;
		fto.start = Date.now();
		this.textList.unshift(fto);
	}
	update(){
		var len = this.textList.length;
		var deleteList = [];
		var currentDate = Date.now();
		for(var i=0;i<len;i++){
			var timeLeft = (currentDate - this.textList[i].start);
			if(this.duration - timeLeft <= 0){
				deleteList.push(i);
				continue;
			}
			var alpha = 0;
			if(this.textList[i].isCrit){
				alpha = 1-(timeLeft/this.critDuration);
				this.textList[i].x += this.critHorizontalIncrease;
				this.textList[i].y += this.critVerticalIncrease;
			} else {
				alpha = 1-(timeLeft/this.duration);
				this.textList[i].x += 15*(i/len);
				this.textList[i].x += this.horizontalIncrease;
				this.textList[i].y += this.verticalIncrease;
			}
			drawTextF(this.textList[i].text,this.textList[i].x - myShip.x +  camera.xOffset,this.textList[i].y - myShip.y +  camera.yOffset,"rgba(234, 55, 18, " + alpha + ")",this.textList[i].font);
		}

		for(var j=0;j<deleteList.length;j++){
			var index = deleteList[j];
			this.textList.splice(index,1);
		}
	}
}

var combatText = new FloatingText();

function addCombatText(text,x,y){
	combatText.add(text,x,y);
}
function addCombatTextCrit(text,x,y){
	combatText.addCrit(text,x,y);
}

class Dot{
	constructor(x,y,radius,lineColor,fillColor){
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.lineColor = lineColor || "white";
		this.fillColor = fillColor || "white";
		this.fillDot = false;
	}
	fill(color){
		if(color != undefined && color != ''){
			this.fillColor = color;
		}
		this.fillDot = true;
	}
	update(){
		gameContext.save();
		gameContext.beginPath();
		gameContext.arc(this.x,this.y,this.radius,0,Math.PI*2,true);
		if(this.fillDot){
			gameContext.fillStyle = this.fillColor;
			gameContext.fill();
		}
		gameContext.strokeStyle = this.lineColor;
		gameContext.lineWidth = 2;
		gameContext.stroke();
		gameContext.restore();
	}
}

class DotLine{
	constructor(title,x,y,length,lineColor,fillColor){
		this.title = title || "title";
		this.x = x;
		this.y = y;
		this.length = length;
		this.lineColor = lineColor || "white";
		this.fillColor = fillColor || "white";
		this.dotList = [];
		this.spacing = 25;
		for(var i=0;i<this.length;i++){
			this.dotList.push(new Dot(90 + this.x +(i*this.spacing),this.y-6,10,this.lineColor,this.fillColor));
		}
	}
	update(){
		drawText(this.title,this.x,this.y);
		for(var i=0;i<this.length;i++){
			this.dotList[i].update();
		}
	}
	fill(amt){
		if(amt == undefined || amt == '' || amt == 0){
			return;
		}
		if(amt > this.length){
			amt = this.length;
		}
		for(var i=0;i<amt;i++){
			this.dotList[i].fill(this.color);
		}
	}
}

class AttributeGraph{
	constructor(x,y){
		this.x = x;
		this.y = y;
		this.title = "Total Attributes";
		this.healthBar = new DotLine("Health",this.x,this.y+30,config.attributeMaxAmount,"orange","red");
		this.speedBar = new DotLine("Speed",this.x,this.y+60,config.attributeMaxAmount,"orange","blue");
		this.weaponBar = new DotLine("Weapon",this.x,this.y+90,config.attributeMaxAmount,"orange","green");
	}
	update(){
		drawText(this.title,this.x+150,this.y);

		this.healthBar.fill(myShip.healthAttribute);
		this.speedBar.fill(myShip.speedAttribute);
		this.weaponBar.fill(myShip.weaponAttribute);

		this.healthBar.update();
		this.speedBar.update();
		this.weaponBar.update();
	}
}


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
	if(myGraph == null){
		myGraph = new AttributeGraph(eventLog.x-350,eventLog.y-25);
	} else {
		myGraph.update();
	}
    if(gameStarted){
    	drawShrinkTimer();
    } else{
    	drawLobbyTimer();
    }

}

function drawJoysticks(){
	if(joysticksFaded){
		return;
	}
	var currentTime = Date.now();
	var timeLeft = currentTime - joystickLastTouch;
	if(jotstickFadeDuration - timeLeft <= 0){
		joysticksFaded = true;
		return;
	}
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
		var totalLength = eventLog.width;
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
	drawTextF("Health",eventLog.x+(eventLog.width/2)-30,eventLog.y-15,"#ECF0F1","17px Georgia");
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
		var powerPercent = Math.floor((myShip.power/config.playerBasePower)*100);
		__showProgress(powerPercent,'weapon-power',boost);
	}
}

function drawToast(){
	var removeArray = [];
	var len = trailingToasts.length;
	var currentDate = Date.now();
	for(var i=0;i<len;i++){
		var toastMessage = trailingToasts[i];
		var timeLeft = (currentDate - toastMessage.received);
		if(toastDuration - timeLeft <= 0){
			removeArray.push(i);
			continue;
		}
		var alpha = 1 - (timeLeft/toastDuration);
		drawTextF(toastMessage.text,gameCanvas.width/2-(toastMessage.text.length*5),(gameCanvas.height/2+70)+(i*20),"rgba(255, 255, 255, " + alpha + ")","20px Georgia");
	}
	for(var j=0;j<removeArray.length;j++){
		trailingToasts.pop();
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
function drawRelativeObjects(dt){
	drawBullets();
	drawExplosions(dt);
	drawPulses(dt);
	drawShips(dt);
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
	if(combatText != null){
		combatText.update();
	}
}
function drawMyShip(ship, dt){
	if(ship.shield != null){
			drawShield(ship);
	}

	drawTrail(ship.trail);

	if (ship.spriteSheet == null){
		switch (ship.color){
			default: {
				ship.spriteSheet = new SpriteSheet(shipRedSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
			case 'red':{
				ship.spriteSheet = new SpriteSheet(shipRedSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
			case 'green':{
				ship.spriteSheet = new SpriteSheet(shipGreenSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
			case '#ff00bf':{
				ship.spriteSheet = new SpriteSheet(shipMagentaSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
			case '#66b3ff':{
				ship.spriteSheet = new SpriteSheet(shipBlueSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
		}
	}
	gameContext.save();
	gameContext.translate(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset);
	ship.spriteSheet.move(0,0);
	ship.spriteSheet.update(dt);
	ship.spriteSheet.draw(ship.radius*2,ship.radius*2);
	gameContext.restore();
	drawWeapon(ship);
}

function drawShip(ship){
	if(ship.shield != null){
		drawShield(ship);
	}
	

	drawTrail(ship.trail);

	if (ship.spriteSheet == null){
		switch (ship.color){
			default: {
				ship.spriteSheet = new SpriteSheet(shipRedSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
			case 'red':{
				ship.spriteSheet = new SpriteSheet(shipRedSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
			case 'green':{
				ship.spriteSheet = new SpriteSheet(shipGreenSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
			case '#ff00bf':{
				ship.spriteSheet = new SpriteSheet(shipMagentaSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
			case '#66b3ff':{
				ship.spriteSheet = new SpriteSheet(shipBlueSVG, 0, 0, 160, 160, 1, 16,true);
				break;
			}
		}
	}

	gameContext.save();
	gameContext.translate(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset);
	ship.spriteSheet.move(0,0);
	ship.spriteSheet.update(dt);
	
	ship.spriteSheet.draw(ship.radius*2,ship.radius*2);
	gameContext.restore();

	drawWeapon(ship);
	if(ship.AIName != null || (playerList[ship.id] != null)){
		var name = ship.AIName || playerList[ship.id]+ "";
		drawTextF(name,ship.x-myShip.x+camera.xOffset-(name.length*3),ship.y-myShip.y+camera.yOffset-35,ship.color,"12px Helvetica");
	}
	if(ship != myShip){
		drawHealthBar(ship);
	}

	//if in range..
	drawReticle(ship);
}

function drawReticle(ship){
	var retLoc = trackTarget(ship);
	if (retLoc == null){
		return;
	}
	gameContext.save();
	gameContext.strokeStyle = 'red';
	gameContext.beginPath();
	//gameContext.arc(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset,config.shieldRadius,0,Math.PI*2,true);
	gameContext.arc(retLoc.x - myShip.x + camera.xOffset, retLoc.y - myShip.y + camera.yOffset,12,0,Math.PI*2,true);
	gameContext.stroke();
	gameContext.restore();
}

function drawExplosion(explosion, dt){
	if (explosion.spriteSheet == null){
		if (!explosion.type){
			explosion.spriteSheet = new SpriteSheet(explosionSVG, 0, 0, 500, 500, 1, 8, false);
		}
		else{
			explosion.spriteSheet = new SpriteSheet(popSVG, 0, 0, 500, 500, 1, 8, false);
		}
		
	}
	if (explosion.spriteSheet.animationComplete){
		return terminateExplosion(explosion.sig);
	}
	gameContext.save();
	gameContext.translate(explosion.x-myShip.x+camera.xOffset,explosion.y-myShip.y+camera.yOffset);
	explosion.spriteSheet.move(0,0);
	explosion.spriteSheet.update(dt);
	
	explosion.spriteSheet.draw(explosion.radius*4,explosion.radius*4);
	gameContext.restore();
}

function drawPulse(pulse, dt){
	if (pulse.spriteSheet == null){
		pulse.spriteSheet = new SpriteSheet(pulseSVG, 0, 0, 200, 200, 1, 6, false);
	}

	if (pulse.spriteSheet.animationComplete){
		return terminatePulse(pulse.sig);
	}
	gameContext.save();
	gameContext.translate(pulse.x-myShip.x+camera.xOffset,pulse.y-myShip.y+camera.yOffset);
	pulse.spriteSheet.move(0,0);
	pulse.spriteSheet.update(dt);
	
	pulse.spriteSheet.draw(2*pulse.radius,2*pulse.radius);
	gameContext.restore();
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
	if (ship.weapon.spriteSheet == null){
		ship.weapon.spriteSheet = new SpriteSheet(cannonSVG, 0, 0, 160, 300, 1, 7,false);
		ship.weapon.spriteSheet.changeFrame(0,6);
	}

	var shipDim = ship.radius || ship.width/4;
	var svgscale = 2.2 * shipDim / 150;

	gameContext.save();
	gameContext.translate(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset);
	gameContext.rotate((ship.weapon.angle + 180)*Math.PI/180);
	ship.weapon.spriteSheet.update(dt);
	ship.weapon.spriteSheet.draw(160 * svgscale,300 * svgscale);
	// switch(ship.weapon.name){
	// 	case "Blaster":{
	// 		gameContext.drawImage(blasterSVG, - blasterSVG.width * svgscale / 2, -  blasterSVG.height * svgscale / 2, blasterSVG.width * svgscale, blasterSVG.height * svgscale);
	// 		break;
	// 	}
	// 	case "PhotonCannon":{
	// 		gameContext.drawImage(photonCannonSVG, - photonCannonSVG.width * svgscale / 2, -  photonCannonSVG.height * svgscale / 2, photonCannonSVG.width * svgscale, photonCannonSVG.height * svgscale);
	// 		break;
	// 	}
	// 	case "MassDriver":{
	// 		gameContext.drawImage(massDriverSVG, - massDriverSVG.width * svgscale / 2, -  massDriverSVG.height * svgscale / 2, massDriverSVG.width * svgscale, massDriverSVG.height * svgscale);
	// 		break;
	// 	}
	// 	case "ParticleBeam":{
	// 		gameContext.drawImage(particleBeamSVG, - particleBeamSVG.width * svgscale / 2, -  particleBeamSVG.height * svgscale / 2, particleBeamSVG.width * svgscale, particleBeamSVG.height * svgscale);
	// 		break;
	// 	}
	// }
	
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
			gameContext.drawImage(healthAttributeSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "WeaponAttribute":{
			gameContext.drawImage(weaponAttributeSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "SpeedAttribute":{
			gameContext.drawImage(speedAttributeSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
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
			// gameContext.beginPath();
			// gameContext.lineWidth = 3;
			// gameContext.strokeStyle = "red";
			// gameContext.arc(gadget.x-myShip.x+camera.xOffset,gadget.y-myShip.y+camera.yOffset,gadget.radius,0,Math.PI*2,true);
			// gameContext.stroke();
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

			if (bullet.spriteSheet == null){
				switch (bullet.color){
					default: {
						if(bullet.isCrit){
							bullet.spriteSheet = new SpriteSheet(bulletCritSVG, 0, 0, 50, 260, 1, 7,true);
							break;
						}
						bullet.spriteSheet = new SpriteSheet(bulletSVG, 0, 0, 50, 260, 1, 7,true);
						break;
					}
					case 'red':{
						bullet.spriteSheet = new SpriteSheet(bulletSVG, 0, 0, 50, 260, 1, 7,true);
						break;
					}
					case 'green':{
						bullet.spriteSheet = new SpriteSheet(bulletSVG, 0, 0, 50, 260, 1, 7,true);
						break;
					}
					case '#ff00bf':{
						bullet.spriteSheet = new SpriteSheet(bulletSVG, 0, 0, 50, 260, 1, 7,true);
						break;
					}
					case '#66b3ff':{
						bullet.spriteSheet = new SpriteSheet(bulletSVG, 0, 0, 50, 260, 1, 7,true);
						break;
					}
				}
			}
			// switch(color){
			// 	default: {
			// 		bulletSheet.changeFrame(0,4);
			// 		break;
			// 	}
			// 	case 'red':{
			// 		bulletSheet.changeFrame(0,1);
			// 		break;
			// 	}
			// 	case 'green':{
			// 		bulletSheet.changeFrame(0,2);
			// 		break;
			// 	}
			// 	case '#ff00bf':{
			// 		bulletSheet.changeFrame(0,3);
			// 		break;
			// 	}
			// 	case '#66b3ff':{
			// 		bulletSheet.changeFrame(0,0);
			// 		break;
			// 	}
			// }

			gameContext.save();
			gameContext.translate(bullet.x-myShip.x+camera.xOffset,bullet.y-myShip.y+camera.yOffset);
			gameContext.rotate(bullet.angle*Math.PI/180);
			bullet.spriteSheet.move(0,0);
			bullet.spriteSheet.update(dt);
			bullet.spriteSheet.draw(2*bullet.width*50/26,2*bullet.height*260/62);
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


function drawShips(dt){
	for(var shipKey in shipList){
		var ship = shipList[shipKey];
		if(ship == null){
			continue;
		}
		if(shipKey == myID){
			drawMyShip(ship, dt);
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

function drawExplosions(dt){
	for(var sig in explosionList){
		if(explosionList[sig] == null){
			continue;
		}
		if(camera.inBounds(explosionList[sig])){
			drawExplosion(explosionList[sig], dt);
		}
	}
}

function drawPulses(dt){
	for(var sig in pulseList){
		if(pulseList[sig] == null){
			continue;
		}
		if(camera.inBounds(pulseList[sig])){
			drawPulse(pulseList[sig], dt);
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

function changeGadgetHUD(name){
	for(var i=0;i<gadgetArray.length;i++){
		if(gadgetArray[i].value == name){
			$('#currentGadget').attr('xlink:href',gadgetArray[i].image);
			break;
		}
	}
	__showProgress(shipList[myID].gadgetCooldown,'gadget-cooldown');
}
function changeWeaponHUD(name){
	for(var i=0;i<weaponArray.length;i++){
		if(weaponArray[i].value == name){
			$('#currentWeapon').attr('xlink:href',weaponArray[i].image);
			break;
		}
	}
}
