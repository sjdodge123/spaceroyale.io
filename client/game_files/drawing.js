var background = new Image();
background.src = 'img/background.jpg';
function drawBackground() {
	canvasContext.save();
	canvasContext.drawImage(background,world.x-myShip.x,world.y-myShip.y,world.width+canvas.width,world.height+canvas.height);
	canvasContext.restore();
}

function drawFlashScreen(){
	canvasContext.save();
	canvasContext.fillStyle = 'red';
	canvasContext.fillRect(0,0,canvas.width,canvas.height);
	canvasContext.restore();
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

//DRAWING HUD UI
function drawHUD(){
	drawAliveCounter();
	drawKillCounter();
    drawHPCounter();
    drawToast();
    drawPing();
    drawTotalPlayers();
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

function drawAliveCounter(){
	drawText(getShipListCount() + " alive",canvas.width-60,20);
}

function drawKillCounter(){
	drawText("Killed " + myShip.killList.length,canvas.width-190,20);
}

function drawHPCounter(){
	if(!iAmAlive){
		drawText("HP:" + 0,10,20);
		return;
	}
	drawText("HP:" + shipList[myID].health,10,20);
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
	var rad = canvas.height/2 * 0.95;
	var angle = Math.atan2(world.whiteBound.y-myShip.y,world.whiteBound.x-myShip.x) + Math.PI/2;
	var x = canvas.width/2 + rad * Math.cos(angle - Math.PI/2);
	var y = canvas.height/2 + rad * Math.sin(angle - Math.PI/2);

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
	if(shrinkTimeLeft > 0){
		drawText(shrinkTimeLeft + " until shrink",canvas.width/2,20);
	} else{
		drawText("Shrinking world..",canvas.width/2,20);
	}
}

function drawLobbyTimer(){
	drawText(lobbyTimeLeft + " until start",canvas.width/2,20);
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
	drawWorld();
	drawBounds();
}
function drawShip(ship){
	if(ship.shield != null && ship.shield.alive){
		drawShield(ship);
	}
	canvasContext.save();
	canvasContext.translate(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset);
	canvasContext.rotate(ship.angle*Math.PI/180);
	canvasContext.shadowColor = ship.glowColor;
	canvasContext.shadowOffsetX = 1;
	canvasContext.shadowOffsetY = 1;
	canvasContext.shadowBlur = 16;
	canvasContext.fillStyle = ship.color;
	canvasContext.fillRect(-ship.width/2,-ship.height/2,ship.width,ship.height);
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
	canvasContext.beginPath();
	canvasContext.fillStyle = asteroid.color;
	canvasContext.arc(asteroid.x-myShip.x+camera.xOffset,asteroid.y-myShip.y+camera.yOffset,asteroid.radius,0,Math.PI*2,true);
	canvasContext.fill();
	canvasContext.restore();
}

function drawItem(item){
	canvasContext.save();
	canvasContext.fillStyle = item.color;
	canvasContext.fillRect(item.x-myShip.x+camera.xOffset,item.y-myShip.y+camera.yOffset,item.width,item.height);
	canvasContext.strokeStyle = "white";
	canvasContext.lineWidth=2;
    canvasContext.rect(item.x-myShip.x+camera.xOffset,item.y-myShip.y+camera.yOffset,item.width,item.height);
    canvasContext.stroke();
    canvasContext.restore();
}

function drawPlanet(planet){
	canvasContext.save();
	canvasContext.beginPath();
	canvasContext.fillStyle = planet.color;
	canvasContext.arc(planet.x-myShip.x+camera.xOffset,planet.y-myShip.y+camera.yOffset,planet.radius,0,Math.PI*2,true);
	canvasContext.fill();
	canvasContext.restore();
}

function drawNebula(nebula){
	canvasContext.save();
	canvasContext.beginPath();
	canvasContext.fillStyle = nebula.color;
	canvasContext.arc(nebula.x-myShip.x+camera.xOffset,nebula.y-myShip.y+camera.yOffset,nebula.radius,0,Math.PI*2,true);
	canvasContext.fill();
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
