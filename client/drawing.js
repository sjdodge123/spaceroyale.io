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
	canvasContext.fillStyle = 'white';
	canvasContext.fillRect(ship.x,ship.y,ship.width,ship.height);
}

function drawShips(){
	for(var ship in shipList){
		if(ship != null){
			drawShip(shipList[ship]);
		}
	}
}