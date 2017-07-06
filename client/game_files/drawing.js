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
		canvasContext.drawImage(this.image,this.frameIndex[this.XframeIndex][this.YframeIndex].sx,this.frameIndex[this.XframeIndex][this.YframeIndex].sy,this.frameWidth,this.frameHeight,this.x-(width/2),this.y-(height/2),width,height);
	}
}

var planetSheet = new SpriteSheet(planetSVG,0,0,500,500,1,2);
var asteroidSheet = new SpriteSheet(asteroidSVG,0,0,500,500,3,3);
var nebulaSheet = new SpriteSheet(nebulaSVG,0,0,500,500,1,1);
var tradeShipSheet = new SpriteSheet(tradeShipSVG,0,0,200,600,1,1);


function drawBackground() {
	canvasContext.save();
	canvasContext.fillStyle = 'black';
	canvasContext.fillRect(0,0,canvas.width,canvas.height);
	canvasContext.drawImage(background,world.x-myShip.x,world.y-myShip.y,world.width+canvas.width,world.height+canvas.height);
	canvasContext.restore();
}

function drawFlashScreen(){
	canvasContext.save();
	canvasContext.fillStyle = 'red';
	canvasContext.fillRect(0,0,canvas.width,canvas.height);
	canvasContext.restore();
}

function drawQuadTree(currentQuad){
	canvasContext.save();
	canvasContext.translate(currentQuad.minX - myShip.x + camera.xOffset, currentQuad.minY - myShip.y + camera.yOffset);
	canvasContext.beginPath();
	canvasContext.lineWidth = "6";
	canvasContext.strokeStyle = "blue";
	canvasContext.rect(0, 0, currentQuad.width, currentQuad.height);
	canvasContext.stroke();
	canvasContext.restore();

	for (var i = 0; i < currentQuad.nodes.length; i++){
		if (currentQuad.nodes[i] != null){
			drawQuadTree(currentQuad.nodes[i]);
		}
	}
}

function drawText(text,x,y){
	canvasContext.save();
	canvasContext.fillStyle = 'white';
	canvasContext.font="20px Georgia";
	canvasContext.fillText(text,x,y);
	canvasContext.restore();
}
function drawTextF(text,x,y,color,font){
	canvasContext.save();
	canvasContext.fillStyle = color;
	canvasContext.font=font;
	canvasContext.fillText(text,x,y);
	canvasContext.restore();
}

function drawFlashingText(text,x,y,color,font,flashColor,timeLeft){
	if(timeLeft%2 == 1){
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
    drawWeaponCooldown();
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
		canvasContext.save();
		canvasContext.beginPath();
		canvasContext.fillStyle = "rgba(0, 0, 255, 0.3)";
		canvasContext.arc(joystickMovement.baseX,joystickMovement.baseY,joystickMovement.baseRadius,0,Math.PI*2,true);
		canvasContext.fill();

		canvasContext.strokeStyle = "blue";
		canvasContext.beginPath();
		canvasContext.arc(joystickMovement.stickX,joystickMovement.stickY,joystickMovement.stickRadius,0,Math.PI*2,true);
		canvasContext.stroke();

		canvasContext.restore();
	}
	if(joystickCamera != null && isTouchScreen){
		canvasContext.save();
		canvasContext.beginPath();
		canvasContext.fillStyle = "rgba(255, 0, 0, 0.3)";
		canvasContext.arc(joystickCamera.baseX,joystickCamera.baseY,joystickCamera.baseRadius,0,Math.PI*2,true);
		canvasContext.fill();

		if( 1 - (cooldownRemaining/currentWeaponCooldown) >= 1){
			canvasContext.strokeStyle = "red";
			canvasContext.beginPath();
			canvasContext.arc(joystickCamera.baseX,joystickCamera.baseY,joystickCamera.fireradius,0,Math.PI*2,true);
			canvasContext.stroke();
		}
		canvasContext.strokeStyle = "red";
		canvasContext.beginPath();
		canvasContext.arc(joystickCamera.stickX,joystickCamera.stickY,joystickCamera.stickRadius,0,Math.PI*2,true);
		canvasContext.stroke();

		canvasContext.beginPath();
		canvasContext.moveTo(canvas.width/2,canvas.height/2);
		canvasContext.lineTo(canvas.width/2+joystickCamera.dx*500,canvas.height/2+joystickCamera.dy*500);
		canvasContext.stroke();

		canvasContext.restore();
	}
}

function drawAliveCounter(){
	drawText(getShipListCount() + " alive",eventLog.x + eventLog.width-60,eventLog.y-40);
}

function drawWeaponHUD(){
	if(myShip != null){
		var svgscale = .25;
		canvasContext.save();
		canvasContext.translate(eventLog.x + eventLog.width + 50,eventLog.y+(eventLog.height/2));
		canvasContext.rotate(Math.PI/180);
		switch(myShip.weapon.name){
			case "Blaster":{
				canvasContext.drawImage(blasterSVG, - blasterSVG.width * svgscale / 2, -  blasterSVG.height * svgscale / 2, blasterSVG.width * svgscale, blasterSVG.height * svgscale);
				break;
			}
			case "PhotonCannon":{
				canvasContext.drawImage(photonCannonSVG, - photonCannonSVG.width * svgscale / 2, -  photonCannonSVG.height * svgscale / 2, photonCannonSVG.width * svgscale, photonCannonSVG.height * svgscale);
				break;
			}
			case "MassDriver":{
				canvasContext.drawImage(massDriverSVG, - massDriverSVG.width * svgscale / 2, -  massDriverSVG.height * svgscale / 2, massDriverSVG.width * svgscale, massDriverSVG.height * svgscale);
				break;
			}
		}
		canvasContext.restore();
	}
	
}

function drawKillCounter(){
	drawText("Killed " + myShip.killList.length,eventLog.x,eventLog.y-40);
}

function drawHPCounter(){
	if(shipList[myID] != null){
		canvasContext.save();
		if(shipList[myID].health > 70){
			canvasContext.fillStyle = "Green";
		}else if(shipList[myID].health > 30){
			canvasContext.fillStyle = "yellow";
		} else {
			canvasContext.fillStyle = "tomato";
		}

		canvasContext.fillRect(eventLog.x,eventLog.y-30,(shipList[myID].health/100)*eventLog.width/2,20);
		canvasContext.restore();
		drawTextF("Health",eventLog.x+(eventLog.width/4)-30,eventLog.y-15,"#ECF0F1","17px Georgia");
	}
}
function drawWeaponCooldown(){
	canvasContext.save();
	canvasContext.fillStyle = myShip.color;
	canvasContext.fillRect(eventLog.x+eventLog.width/2,eventLog.y-30,(1 - (cooldownRemaining/currentWeaponCooldown))*eventLog.width/2,20);
	canvasContext.restore();
	drawTextF("Power",eventLog.x+eventLog.width/2+(eventLog.width/4)-30,eventLog.y-15,"#ECF0F1","17px Georgia");
}

function drawToast(){
	if(toastMessage != null){
		drawText(toastMessage,canvas.width/2-(toastMessage.length*5),canvas.height/2+50);
	}
}
function drawTotalPlayers(){
	if(totalPlayers !=null){
		var message = "Players on Server: " + totalPlayers;
		drawTextF(message,canvas.width-(message.length*5),canvas.height - 15,"#e0e0eb","10px Georgia");
	}
}

function drawPing(){
	if(ping != null){
		var message = "Ping: " + ping;
		drawTextF(message,canvas.width-(message.length*5) - 125,canvas.height - 15,"#e0e0eb","10px Georgia");
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
	var rad = canvas.height/2 * 0.95;
	var angle = Math.atan2(world.whiteBound.y-myShip.y,world.whiteBound.x-myShip.x) + Math.PI/2;

	canvasContext.save();
	canvasContext.translate(x, y);
	canvasContext.rotate(angle);
	canvasContext.strokeStyle = myShip.color;
	canvasContext.beginPath();
	canvasContext.lineWidth = 5;
	canvasContext.moveTo(-20,23);
	canvasContext.lineTo(0,3);
	canvasContext.lineTo(20,23);
	canvasContext.stroke();
	canvasContext.restore();
}

function drawEventLog(){
	canvasContext.save();
	canvasContext.globalAlpha = 0.5;
	canvasContext.fillStyle = eventLog.backgroundColor;
	canvasContext.fillRect(eventLog.x,eventLog.y,eventLog.width,eventLog.height);
	canvasContext.fillStyle = eventLog.textColor;
	canvasContext.font=	eventLog.textStyle;
	var len = eventLog.printList.length-1;
	if(len != -1){
		for(var i=len;i>=0;i--){
			canvasContext.fillText(eventLog.printList[i],eventLog.textX(),eventLog.textY()+(i*eventLog.textSize));
		}
	}
	canvasContext.restore();
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
	drawText(lobbyTimeLeft + " until start",eventLog.x + eventLog.width/2-40,eventLog.y-40);
}


//DRAWING OBJECTS RELATIVE TO CAMERA
function drawRelativeObjects(){
	if(myID != null && shipList != null && shipList[myID] != null){
        myShip = shipList[myID];
        camera.centerOnObject(myShip);
		camera.draw();
	}
	drawShips();
	drawAsteroids();
	drawItems();
	drawBullets();
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
	if(ship.shield != null && ship.shield.alive){
		drawShield(ship);
	}
	canvasContext.save();
	canvasContext.translate(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset);
	canvasContext.rotate(ship.spriteAngle*Math.PI/180);
	canvasContext.shadowColor = ship.glowColor;
	canvasContext.shadowOffsetX = 1;
	canvasContext.shadowOffsetY = 1;
	canvasContext.shadowBlur = 16;

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
	canvasContext.drawImage(shipSVG, -ship.radius, -ship.radius, 2*ship.radius, 2*ship.radius);
	canvasContext.restore();

	drawWeapon(ship);
}
function drawWeapon(ship){
	var svgscale = 2 * ship.radius / shipRedSVG.width;
	canvasContext.save();
	canvasContext.translate(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset);
	canvasContext.rotate((ship.angle + 180)*Math.PI/180);
	switch(ship.weapon.name){
		case "Blaster":{
			canvasContext.drawImage(blasterSVG, - blasterSVG.width * svgscale / 2, -  blasterSVG.height * svgscale / 2, blasterSVG.width * svgscale, blasterSVG.height * svgscale);
			break;
		}
		case "PhotonCannon":{
			canvasContext.drawImage(photonCannonSVG, - photonCannonSVG.width * svgscale / 2, -  photonCannonSVG.height * svgscale / 2, photonCannonSVG.width * svgscale, photonCannonSVG.height * svgscale);
			break;
		}
		case "MassDriver":{
			canvasContext.drawImage(massDriverSVG, - massDriverSVG.width * svgscale / 2, -  massDriverSVG.height * svgscale / 2, massDriverSVG.width * svgscale, massDriverSVG.height * svgscale);
			break;
		}
	}
	
	canvasContext.restore();

}
function drawShield(ship){
	canvasContext.save();
	canvasContext.beginPath();
	canvasContext.strokeStyle = ship.shield.color;
	canvasContext.arc(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset,ship.shield.radius,0,Math.PI*2,true);
	canvasContext.stroke();
	canvasContext.restore();
}

function drawAsteroid(asteroid){
	canvasContext.save();
	canvasContext.translate(asteroid.x-myShip.x+camera.xOffset,asteroid.y-myShip.y+camera.yOffset);
	canvasContext.rotate(asteroid.spriteAngle*Math.PI/180);
	asteroidSheet.move(0,0);

	if(asteroid.health == asteroid.baseHealth){
		asteroidSheet.changeFrame(0,asteroid.artType);
	}
	if(asteroid.health < asteroid.baseHealth*.80){
		asteroidSheet.changeFrame(1,asteroid.artType);
	}
	if(asteroid.health < asteroid.baseHealth*.40){
		asteroidSheet.changeFrame(2,asteroid.artType);
	}
	
	asteroidSheet.draw(asteroid.radius*2,asteroid.radius*2);
	canvasContext.restore();	
}

function drawItem(item){
	canvasContext.save();

	switch(item.name){
		default:{
			canvasContext.beginPath();
			canvasContext.fillStyle = item.color;
			canvasContext.arc(item.x-myShip.x+camera.xOffset,item.y-myShip.y+camera.yOffset,item.radius,0,Math.PI*2,true);
			canvasContext.fill();
			canvasContext.beginPath();
			canvasContext.strokeStyle = "white";
			canvasContext.lineWidth=2;
		    canvasContext.arc(item.x-myShip.x+camera.xOffset,item.y-myShip.y+camera.yOffset,item.radius,0,Math.PI*2,true);
		    canvasContext.stroke();
			break;
		}
		case "BlasterItem":{
			canvasContext.drawImage(blasterItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "PhotonCannonItem":{
			canvasContext.drawImage(photonCannonItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "MassDriverItem":{
			canvasContext.drawImage(massDriverItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "HPItem":{
			canvasContext.drawImage(healthItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
		case "ShieldItem":{
			canvasContext.drawImage(shieldItemSVG,item.x-item.radius-myShip.x+camera.xOffset,item.y-item.radius-myShip.y+camera.yOffset,item.radius*2,item.radius*2);
			break;
		}
	}
    canvasContext.restore();
}

function drawPlanet(planet){
	canvasContext.save();
	planetSheet.move(planet.x-myShip.x+camera.xOffset,planet.y-myShip.y+camera.yOffset);
	planetSheet.changeFrame(0,planet.artType);
	planetSheet.draw(planet.radius*2,planet.radius*2);
	canvasContext.restore();
}

function drawNebula(nebula){
	canvasContext.save();
	nebulaSheet.move(nebula.x-myShip.x+camera.xOffset,nebula.y-myShip.y+camera.yOffset);
	nebulaSheet.draw(nebula.radius*2,nebula.radius*2);
	canvasContext.restore();
}

function drawTradeShip(tradeShip){
	canvasContext.save();
	canvasContext.translate(tradeShip.x-myShip.x+camera.xOffset,tradeShip.y-myShip.y+camera.yOffset);
	canvasContext.rotate((tradeShip.angle+90)*Math.PI/180);
	tradeShipSheet.move(0,0);
	tradeShipSheet.draw(tradeShip.height,tradeShip.width);
    canvasContext.restore();
}

function drawTradeShipTrail(circle){
	canvasContext.save();
	canvasContext.beginPath();
	canvasContext.lineWidth = 3;
	canvasContext.strokeStyle = circle.color;
	canvasContext.arc(circle.x-myShip.x+camera.xOffset,circle.y-myShip.y+camera.yOffset,circle.radius,0,Math.PI*2,true);
	canvasContext.stroke();
	canvasContext.restore();
}

function drawBullet(bullet){
	canvasContext.save();
	canvasContext.translate(bullet.x-myShip.x+camera.xOffset,bullet.y-myShip.y+camera.yOffset);
	canvasContext.rotate(bullet.angle*Math.PI/180);
	canvasContext.fillStyle = bullet.color;
	canvasContext.fillRect(-bullet.width/2,-bullet.height/2,bullet.width,bullet.height);
	canvasContext.restore();
}

function drawWorld(){
	if(world != null){
		canvasContext.save();
		canvasContext.beginPath();
        canvasContext.strokeStyle = world.color;
        canvasContext.rect(world.x-myShip.x+camera.xOffset,world.y-myShip.y+camera.yOffset,world.width,world.height);
        canvasContext.stroke();
        canvasContext.restore();
	}
}

function drawBounds(){
	if(world.whiteBound != null){
		canvasContext.save();
		canvasContext.beginPath();
		canvasContext.lineWidth = 3;
		canvasContext.strokeStyle = world.whiteBound.color;
		canvasContext.arc(world.whiteBound.x-myShip.x+camera.xOffset,world.whiteBound.y-myShip.y+camera.yOffset,world.whiteBound.radius,0,Math.PI*2,true);
		canvasContext.stroke();
		canvasContext.restore();
	}
	if(world.blueBound != null){
		canvasContext.save();
		canvasContext.beginPath();
		canvasContext.lineWidth = 3;
		canvasContext.strokeStyle = world.blueBound.color;
		canvasContext.arc(world.blueBound.x-myShip.x+camera.xOffset,world.blueBound.y-myShip.y+camera.yOffset,world.blueBound.radius,0,Math.PI*2,true);
		canvasContext.stroke();
		canvasContext.restore();
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
