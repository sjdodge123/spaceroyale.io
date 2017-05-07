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

function drawShip(ship) {
	canvasContext.save();
	canvasContext.translate(ship.x,ship.y);
	canvasContext.rotate(ship.angle*Math.PI/180);
	canvasContext.fillStyle = ship.color;
	canvasContext.fillRect(-ship.width/2,-ship.height/2,ship.width,ship.height);
	canvasContext.restore();
}

function drawBullet(bullet){
	canvasContext.save();
	canvasContext.translate(bullet.x,bullet.y);
	canvasContext.rotate(bullet.angle*Math.PI/180);
	canvasContext.fillStyle = bullet.color;
	canvasContext.fillRect(-bullet.width/2,-bullet.height/2,bullet.width,bullet.height);
	canvasContext.restore();
}

function drawShips(){
	for(var ship in shipList){
		if(ship != null){
			drawShip(shipList[ship]);
		}
	}
}

function drawBullets(){
	for(var sig in bulletList){
		if(sig != null){
			drawBullet(bulletList[sig]);
		}
	}
}