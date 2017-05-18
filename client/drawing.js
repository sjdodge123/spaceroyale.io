function drawBackground() {
	canvasContext.fillStyle = 'black';
	canvasContext.fillRect(0,0,canvas.width,canvas.height);
}

function drawFlashScreen(){
	canvasContext.fillStyle = 'red';
	canvasContext.fillRect(0,0,canvas.width,canvas.height);
}

function drawText(text,x,y){
	canvasContext.fillStyle = 'white';
	canvasContext.font="20px Georgia";
	canvasContext.fillText(text,x,y);
}
function drawTextF(text,x,y,color,font){
	canvasContext.fillStyle = color;
	canvasContext.font=font;
	canvasContext.fillText(text,x,y);
}

//DRAWING HUD UI
function drawHUD(){
	drawAliveCounter();
	drawKillCounter();
    drawHPCounter();
    drawToast();
    drawTotalPlayers();
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

function drawDeathText(){
	drawText("You died!",camera.x-60,camera.y);
}

function drawVictoryScreen(){
	drawText("Winner winner chicken dinner!",camera.x-120,camera.y-20);
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
        drawShips();
        drawAsteroids();
        drawItems();
		drawBullets();
		drawPlanets();
		drawWorld();
		drawBounds();
    }
	
}
function drawShip(ship){
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
	canvasContext.beginPath();
	canvasContext.strokeStyle = ship.shield.color;
	canvasContext.arc(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset,ship.shield.radius,0,Math.PI*2,true);
	canvasContext.stroke();
}

function drawAsteroid(asteroid){
	canvasContext.beginPath();
	canvasContext.fillStyle = asteroid.color;
	canvasContext.arc(asteroid.x-myShip.x+camera.xOffset,asteroid.y-myShip.y+camera.yOffset,asteroid.radius,0,Math.PI*2,true);
	canvasContext.fill();
}

function drawItem(item){
	canvasContext.fillStyle = item.color;
	canvasContext.fillRect(item.x-myShip.x+camera.xOffset,item.y-myShip.y+camera.yOffset,item.width,item.height);
	canvasContext.strokeStyle = "white";
	var temp = canvasContext.lineWidth;
	canvasContext.lineWidth=0.5;
	canvasContext.lineWidth = temp;
    canvasContext.rect(item.x-myShip.x+camera.xOffset,item.y-myShip.y+camera.yOffset,item.width,item.height);
    canvasContext.stroke();
}

function drawPlanet(planet){
	canvasContext.beginPath();
	canvasContext.fillStyle = planet.color;
	canvasContext.arc(planet.x-myShip.x+camera.xOffset,planet.y-myShip.y+camera.yOffset,planet.radius,0,Math.PI*2,true);
	canvasContext.fill();
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
		canvasContext.beginPath();
        canvasContext.strokeStyle = world.color;
        canvasContext.rect(world.x-myShip.x+camera.xOffset,world.y-myShip.y+camera.yOffset,world.width,world.height);
        canvasContext.stroke();
	}
}

function drawBounds(){
	var temp = canvasContext.lineWidth;
	if(world.whiteBound != null){
		canvasContext.beginPath();
		canvasContext.lineWidth = 3;
		canvasContext.strokeStyle = world.whiteBound.color;
		canvasContext.arc(world.whiteBound.x-myShip.x+camera.xOffset,world.whiteBound.y-myShip.y+camera.yOffset,world.whiteBound.radius,0,Math.PI*2,true);
		canvasContext.stroke();
	}
	if(world.blueBound != null){
		canvasContext.beginPath();
		canvasContext.lineWidth = 3;
		canvasContext.strokeStyle = world.blueBound.color;
		canvasContext.arc(world.blueBound.x-myShip.x+camera.xOffset,world.blueBound.y-myShip.y+camera.yOffset,world.blueBound.radius,0,Math.PI*2,true);
		canvasContext.stroke();
	}
	canvasContext.lineWidth = temp;
}


function drawShips(){
	for(var shipKey in shipList){
		if(shipList[shipKey] == null){
			continue;
		}
		var ship = shipList[shipKey];
		if(camera.inBounds(ship)){
			drawShip(ship);
			if(ship.shield != null && ship.shield.alive){
				drawShield(ship);
			}
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