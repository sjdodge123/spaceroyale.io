function drawBackground() {
	canvasContext.fillStyle = 'black';
	canvasContext.fillRect(0,0,canvas.width,canvas.height);
}

function drawText(text,x,y){
	canvasContext.fillStyle = 'white';
	canvasContext.font="20px Georgia";
	canvasContext.fillText(text,x,y);
}

function drawAliveCounter(){
	drawText(getShipListCount() + " alive",canvas.width-60,20);
}

function drawShip(ship){
	canvasContext.save();
	canvasContext.translate(ship.x-myShip.x+camera.xOffset,ship.y-myShip.y+camera.yOffset);
	canvasContext.rotate(ship.angle*Math.PI/180);
	canvasContext.fillStyle = ship.color;
	canvasContext.fillRect(-ship.width/2,-ship.height/2,ship.width,ship.height);
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

function drawRelativeObjects(){
	if(myID != null && shipList != null && shipList[myID] != null){
        myShip = shipList[myID];
        camera.centerOnObject(myShip);
		camera.draw();
        drawShips();
		drawBullets();
    }
	
}
function drawShips(cameraX,cameraY){
	for(var shipKey in shipList){
		if(shipList[shipKey] == null){
			continue;
		}
		if(camera.inBounds(shipList[shipKey])){
			drawShip(shipList[shipKey]);
		}
	}
}

function drawBullets(cameraX,cameraY){
	for(var sig in bulletList){
		if(sig == null){
			continue;
		}
		if(camera.inBounds(bulletList[sig])){
			drawBullet(bulletList[sig]);
		}
	}
}