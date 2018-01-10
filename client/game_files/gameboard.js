var trailingToasts,
	asteroidList,
	itemList,
	planetList,
	playerList,
	bulletList,
	nebulaList,
	gadgetList,
	tradeShipList,
	explosionList,
	shipList;

resetGameboard();

function resetGameboard(){
	trailingToasts = [];
	asteroidList = {};
	itemList = {};
	planetList = {};
	playerList = {};
	bulletList = {};
	nebulaList = {};
	gadgetList = {};
	tradeShipList = {};
	explosionList = {};
	shipList = {};
}

function updateGameboard(){
	updateShips();
	updateBullets();
	updateItems();
	updateTradeShips();
	updateGadgets();
}

function updateShips(){
	for(var id in shipList){
		var ship = shipList[id];
		ship.trail.update({x:ship.x, y:ship.y});
	}
}

function updateBullets(){
	for(var sig in bulletList){
		var bullet = bulletList[sig];
		if (bullet.weaponName == "ParticleBeam"){
			continue;
		}
		bullet.trail.update({x:bullet.x, y:bullet.y});
	}
}

function updateItems(){
	var item;
	for(var sig in itemList){
		item = itemList[sig];
		if(item.name == "HPItem"){
			continue;
		}
		var timeLeft = item.itemDecayRate-((Date.now()-item.dropDate)/1000);
		timeLeft = timeLeft.toFixed(1);
		if(timeLeft <= item.itemDecayRate*.33){
			if(timeLeft % 0.5 == 0){
				item.flash = true;
			} else {
				item.flash = false;
			}
			continue;
		}

		if(timeLeft <= item.itemDecayRate*.66){
			if(timeLeft % 1 == 0){
				item.flash = true;
			} else{
				item.flash = false;
			}
		}
	}
}

function updateTradeShips(){
	var tradeShip,trailItem,currentTime, remaining;
	for(var sig in tradeShipList){
		tradeShip = tradeShipList[sig];
		for(var trailSig in tradeShip.trailList){
			trailItem = tradeShip.trailList[trailSig];
			currentTime = Date.now();
			remaining = trailItem.lifetime - (currentTime - trailItem.start);

			if(remaining <= 0){
				delete tradeShip.trailList[trailSig];
			}
		}
	}
}

function updateGadgets(){
	for(var sig in gadgetList){
		var gadget = gadgetList[sig];
	}
}

function terminateBullet(sig){
	if(bulletList[sig] != undefined){
		delete bulletList[sig];
	}
}

function terminateAsteroid(sig){
	if(asteroidList[sig] != undefined){
		delete asteroidList[sig];
	}
}

function terminateExplosion(sig){
	if(explosionList[sig] != undefined){
		delete explosionList[sig];
	}
}

function terminateItem(sig){
	if(itemList[sig] != undefined){
		delete itemList[sig];
	}
}

function terminateGadget(sig){
	if(gadgetList[sig] != undefined){
		delete gadgetList[sig];
	}
}
function terminateTradeShip(sig){
	var trailItem;
	if(tradeShipList[sig] != undefined){
		for(trailItem in tradeShipList[sig].trailList){
			delete tradeShipList[sig].trailList[trailItem];
		}
		delete tradeShipList[sig];
	}
}

function connectSpawnShips(packet){
	if(packet == null){
		return;
	}
	packet = JSON.parse(packet);
	for(var i=0;i<packet.length;i++){
		var ship = packet[i];
		if(shipList[ship[0]] == null){
			 createShip(ship);
		}
	}

}

function appendNewShip(packet){
	if(packet == null){
		return;
	}
	packet = JSON.parse(packet);
	var ship = packet;
	if(shipList[ship[0]] == null){
		createShip(ship);
	}
}

function spawnAIShips(payload){
	var ship = payload;
	payload = JSON.parse(payload);
	for(var i=0;i<payload.length;i++){
		var ship = payload[i];
		if(shipList[ship[0]] == null){
			createShip(ship,true);
		}
	}
}


function createExplosion(x,y,radius,type){
	var sig = generateSig(explosionList);
	explosionList[sig] = {};
	explosionList[sig].sig = sig;
	explosionList[sig].x = x;
	explosionList[sig].y = y;
	explosionList[sig].radius = radius;
	explosionList[sig].type = type; //0 for ship, 1 for bullet
}

function createShip(dataArray,isAI){
	var index = dataArray[0];
	shipList[index] = {};
	shipList[index].isHiding = false;
	shipList[index].spriteAngle = 0;
	shipList[index].rotationRate = 1;
	shipList[index].kills = 0;
	shipList[index].power = config.playerBasePower;
	shipList[index].health = config.playerBaseHealth;
	shipList[index].radius = config.playerBaseRadius;
	shipList[index].healthAttribute = config.attributeHealthStart;
	shipList[index].speedAttribute = config.attributeSpeedStart;
	shipList[index].weaponAttribute = config.attributeWeaponStart;
	shipList[index].id = dataArray[0];
	shipList[index].gadget = "PulseWave";
	shipList[index].gadgetCooldown = 0;
	var shipX, shipY, shipColor;
	shipX = dataArray[1];
	shipY = dataArray[2];
	shipColor = dataArray[3];

	shipList[index].x = shipX;
	shipList[index].y = shipY;
	shipList[index].color = shipColor;
	shipList[index].weapon = {}
	shipList[index].weapon.chargeLevel = 0;
	shipList[index].weapon.angle = dataArray[4];
	shipList[index].weapon.name = dataArray[5];
	shipList[index].weapon.level = dataArray[6];
	shipList[index].weapon.powerCost = dataArray[7];
	if(isAI){
		shipList[index].AIName = dataArray[8]
	}
	shipList[index].trail = new Trail({x:shipX, y:shipY}, 10, 20, shipColor, 0.25, 'circle');
}

function updateShipList(packet){
	if(packet == null){
		return;
	}
	packet = JSON.parse(packet);
	for(var i=0;i<packet.length;i++){
		var ship = packet[i];
		if(shipList[ship[0]] != null){
			shipList[ship[0]].id = ship[0];
			shipList[ship[0]].x = ship[1];
			shipList[ship[0]].y = ship[2];
			shipList[ship[0]].weapon.angle = ship[3];
			shipList[ship[0]].velX = ship[4];
			shipList[ship[0]].velY = ship[5];
		}
	}
}

function spawnItems(packet){
	packet = JSON.parse(packet);
	for(var i=0;i<packet.length;i++){
		var item = packet[i];
		if(itemList[item[0]] == null){
			itemList[item[0]] = {};
			itemList[item[0]].radius = config.baseItemRadius;
			itemList[item[0]].dropDate = Date.now();
			itemList[item[0]].flash = false;
			itemList[item[0]].sig = item[0];
			itemList[item[0]].x = item[1];
			itemList[item[0]].y = item[2];
			itemList[item[0]].name = item[3];
			itemList[item[0]].itemDecayRate = item[4]/1000;
		}
	}

}

function spawnTradeShip(packet){
	packet = JSON.parse(packet);
	if(tradeShipList[packet[0]] == null){
		tradeShipList[packet[0]] = {};
		tradeShipList[packet[0]].weapon = {};
		tradeShipList[packet[0]].weapon.name = config.tradeShipWeapon;
		tradeShipList[packet[0]].weapon.level = config.tradeShipWeaponLevel;
		tradeShipList[packet[0]].weapon.angle = packet[5];
		tradeShipList[packet[0]].trailList = {};
		tradeShipList[packet[0]].sig = packet[0];
		tradeShipList[packet[0]].x = packet[1];
		tradeShipList[packet[0]].y = packet[2];
		tradeShipList[packet[0]].height = packet[3];
		tradeShipList[packet[0]].width = packet[4];
		tradeShipList[packet[0]].angle = packet[5];
	}
}

function updateTradeShipList(packet){
	if(packet == null){
		return;
	}
	var i,j,len1,ts,len2,trail,trailItem;
	packet = JSON.parse(packet);
	len1 = packet.length;

	for(i=0;i<len1;i++){
		ts = packet[i];
		if(tradeShipList[ts[0]] != null){
			tradeShipList[ts[0]].x = ts[1];
			tradeShipList[ts[0]].y = ts[2];
			tradeShipList[ts[0]].weapon.angle = ts[3];
			trail = ts[4];
			len2 = trail.length;
			for(j=0;j<len2;j++){
				trailItem = trail[j];
				if(tradeShipList[ts[0]].trailList[trailItem[0]] == null){
					tradeShipList[ts[0]].trailList[trailItem[0]] = {};
					tradeShipList[ts[0]].trailList[trailItem[0]].lifetime = config.tradeShipTrailDuration*1000;
					tradeShipList[ts[0]].trailList[trailItem[0]].start = Date.now();
					tradeShipList[ts[0]].trailList[trailItem[0]].sig = trailItem[0];
				}
				tradeShipList[ts[0]].trailList[trailItem[0]].x = trailItem[1];
				tradeShipList[ts[0]].trailList[trailItem[0]].y = trailItem[2];
				tradeShipList[ts[0]].trailList[trailItem[0]].radius = trailItem[3];
				tradeShipList[ts[0]].trailList[trailItem[0]].color = trailItem[4];
			}
		}
	}

}

function updateBulletList(packet){
	if(packet == null){
		return;
	}
	packet = JSON.parse(packet);
	for(var i=0;i<packet.length;i++){
		var bullet = packet[i];
		if(bulletList[bullet[0]] != null){
			bulletList[bullet[0]].id = bullet[0];
			bulletList[bullet[0]].x = bullet[1];
			bulletList[bullet[0]].y = bullet[2];
			bulletList[bullet[0]].angle = bullet[3];
			bulletList[bullet[0]].width = bullet[4];
			bulletList[bullet[0]].height = bullet[5];
		}
	}

}

function updateGadgetList(packet){
	if(packet == null){
		return;
	}
	packet = JSON.parse(packet);
	for(var i=0;i<packet.length;i++){
		var gadget = packet[i];
		if(gadgetList[gadget[0]] != null){
			gadgetList[gadget[0]].id = gadget[0];
			gadgetList[gadget[0]].x = gadget[1];
			gadgetList[gadget[0]].y = gadget[2];
			gadgetList[gadget[0]].angle = gadget[3];
		}
	}
}

function updateItemList(packet){
	if(packet == null){
		return;
	}
	packet = JSON.parse(packet);
	for(var i=0;i<packet.length;i++){
		var item = packet[i];
		if(itemList[item[0]] != null){
			itemList[item[0]].sig = item[0];
			itemList[item[0]].x = item[1];
			itemList[item[0]].y = item[2];
		}
	}
}


function equipItem(packet){
	packet = JSON.parse(packet);
	var name = packet[1];
	var level = packet[2];
	var powerCost = packet[3];

	if(shipList[packet[0]] == null){
		return;
	}
	if(name == "Shield"){
		shipList[packet[0]].shield = {};
		shipList[packet[0]].shield.level = level;
		return;
	}
	shipList[packet[0]].weapon.name = name;
	shipList[packet[0]].weapon.level = level;
	shipList[packet[0]].weapon.powerCost = powerCost;
	if(packet[0] == myShip.id){
		changeWeaponHUD(name);
	}
}

function updateItem(packet){
	packet = JSON.parse(packet);
	var name = packet[1];
	var level = packet[2];

	if(name == "Shield"){
		shipList[packet[0]].shield.level = level;
		return;
	}
	shipList[packet[0]].weapon.level = level;
}
function updateShield(packet){
	packet = JSON.parse(packet);
	var owner = packet[0];
	var level = packet[1];
	var alive = packet[2];

	if(!alive){
		shipList[owner].shield = null;
		return;
	}
	shipList[owner].shield.level = level;
}


function spawnAsteroids(packet){
	packet = JSON.parse(packet);

	for(var i=0;i<packet.length;i++){
		var asteroid = packet[i];
		if(asteroidList[asteroid[0]] == null){
			asteroidList[asteroid[0]] = {};
			asteroidList[asteroid[0]].health = config.asteroidBaseHealth;
			asteroidList[asteroid[0]].sig = asteroid[0];
			asteroidList[asteroid[0]].x = asteroid[1];
			asteroidList[asteroid[0]].y = asteroid[2];
			asteroidList[asteroid[0]].angle = asteroid[3];
			asteroidList[asteroid[0]].radius = asteroid[4];
			asteroidList[asteroid[0]].artType = asteroid[5];
		}
	}
}

function spawnPlanets(packet){
	packet = JSON.parse(packet);

	for(var i=0;i<packet.length;i++){
		var planet = packet[i];
		if(planetList[planet[0]] == null){
			planetList[planet[0]] = {};
			planetList[planet[0]].sig = planet[0];
			planetList[planet[0]].x = planet[1];
			planetList[planet[0]].y = planet[2];
			planetList[planet[0]].radius = planet[3];
			planetList[planet[0]].artType = planet[4];
		}
	}
}

function spawnNebula(packet){
	packet = JSON.parse(packet);

	for(var i=0;i<packet.length;i++){
		var nebula = packet[i];
		if(nebulaList[nebula[0]] == null){
			nebulaList[nebula[0]] = {};
			nebulaList[nebula[0]].sig = nebula[0];
			nebulaList[nebula[0]].x = nebula[1];
			nebulaList[nebula[0]].y = nebula[2];
			nebulaList[nebula[0]].radius = nebula[3];
		}
	}
}

function worldResize(payload){
	payload = JSON.parse(payload);
	world = {};
	world.x = payload[0];
	world.y = payload[1];
	world.width = payload[2];
	world.height = payload[3];
	world.blueBound = {};
	world.blueBound.x = payload[4];
	world.blueBound.y = payload[5];
	world.blueBound.radius = payload[6];
	world.whiteBound = {};
	world.whiteBound.x = payload[7];
	world.whiteBound.y = payload[8];
	world.whiteBound.radius = payload[9];
}

function whiteBoundShrinking(payload){
	payload = JSON.parse(payload);
	if(world.whiteBound != null){
		world.whiteBound.x = payload[0];
		world.whiteBound.y = payload[1];
		world.whiteBound.radius = payload[2];
	}
}

function blueBoundShrinking(payload){
	payload = JSON.parse(payload);
	if(world.blueBound != null){
		world.blueBound.x = payload[0];
		world.blueBound.y = payload[1];
		world.blueBound.radius = payload[2];
	}
}

function weaponFired(payload){
	var id,ship,weaponName,weaponLevel,numBullets,i,bullet,powerCost=0;
	payload = JSON.parse(payload);
	id = payload[0];
	ship = shipList[id];
	weaponName = payload[1];
	weaponLevel = payload[2];
	numBullets = payload[3];

	if(shipList[id] == null){
		ship = tradeShipList[id];
	}
	if (ship == null){
		return;
	}

	if (ship.weapon.spriteSheet != null){
		ship.weapon.spriteSheet.changeFrame(0,0);
	}
	for(i=4;i<numBullets+4;i++){
		bullet = payload[i];
		if(bulletList[bullet[0]] == null){
			bulletList[bullet[0]] = {};
			bulletList[bullet[0]].weaponName = weaponName;
			bulletList[bullet[0]].velX = 0;
			bulletList[bullet[0]].velY = 0;
			bulletList[bullet[0]].owner = id;

			var bulletX, bulletY, bulletWidth;
			bulletX     = bullet[1];
			bulletY     = bullet[2];
			bulletWidth = bullet[5];
			bulletList[bullet[0]].x = bulletX;
			bulletList[bullet[0]].y = bulletY;
			bulletList[bullet[0]].width = bulletWidth;

			bulletList[bullet[0]].angle = bullet[3];
			bulletList[bullet[0]].speed = bullet[4];
			bulletList[bullet[0]].height = bullet[6];
			bulletList[bullet[0]].isCrit = bullet[7];
			bulletList[bullet[0]].trail = new Trail({x:bulletX, y:bulletY}, 30, 0.75*bulletWidth, ship.color, 0.2, 'circle');
		}
	}

	if(camera.inBounds(ship)){
		if(weaponName == "Blaster"){
			powerCost = config.blasterPowerCost;
        	playSound(blasterShot);
    	}
    	if(weaponName == "PhotonCannon"){
    		powerCost = config.photonCannonPowerCost;
    		if(numBullets >= 3){
    			powerCost += config.photonCannonChargeCost;
    		}
    		if(numBullets == 5){
    			powerCost += config.photonCannonChargeCost;
    		}
        	playSound(photonCannonShot);
    	}
    	if(weaponName == "MassDriver"){
    		powerCost = config.massDriverPowerCost;
    		if(weaponLevel == 3){
    			playSound(massDriverShot2);
    		} else{
    			playSound(massDriverShot1);
    		}
    	}
	}
	ship.power -= powerCost;
}

function gadgetActivated(packet){
	packet = JSON.parse(packet);
	if(gadgetList[packet[0]] == null){
		gadgetList[packet[0]] = {};
		gadgetList[packet[0]].sig = packet[0];
		gadgetList[packet[0]].type = packet[1];
		gadgetList[packet[0]].x = packet[2];
		gadgetList[packet[0]].y = packet[3];
		gadgetList[packet[0]].owner = packet[4];

		if(gadgetList[packet[0]].type == "Pulse"){
			gadgetList[packet[0]].radius = config.pulseRadius;
		}
		if(gadgetList[packet[0]].type == "Drone"){
			gadgetList[packet[0]].radius = config.droneRadius;
		}
		if(gadgetList[packet[0]].type == "ForceShield"){
			gadgetList[packet[0]].radius = config.forceShieldRadius;
		}
	}
}

class Trail {
	constructor(initialPosition, length, lineWidth, color, alphaStart, type){
		this.vertices = [];
		this.length = length;
		for (var i = 0; i < this.length; i++){
			this.vertices.push(initialPosition);
		}
		this.lineWidth = lineWidth;
		this.alphaStart = alphaStart;
		this.colorPrefix  = null;
		this.initialColor = null;
		this.colorToRGBA(color);
		this.type = type;
	}
	update(currentPosition){
		for (var i = this.length - 1; i > 0; i--){
			this.vertices[i] = this.vertices[i-1];
		}
		this.vertices[0] = currentPosition;
	}
	colorToRGBA(color){
		switch(color){
			default: {
				this.colorPrefix  = 'rgba(167,167,167, ';
				break;
			}
			case 'red':{
				this.colorPrefix  = 'rgba(255,0,0, ';
				break;
			}
			case 'green':{
				this.colorPrefix  = 'rgba(0,255,0, ';
				break;
			}
			case '#ff00bf':{
				this.colorPrefix  = 'rgba(255,0,191, ';
				break;
			}
			case '#66b3ff':{
				this.colorPrefix  = 'rgba(102,179,255, ';
				break;
			}
		}
		this.initialColor = this.colorPrefix + this.alphaStart.toString() + ')';
	}
}
	/*
	draw(){
		switch(this.type){
			case 'circle':{
				var colorprefix = 'rgba(255,255,255, ';
				for (var i = 0; i < this.length; i++){
				//for (var i = this.length - 1; i >= 0; i--){
					var point = this.vertices[i];
					var alpha = Math.round(100 * (this.length - 1 - i) / (this.length - 1)) / 100; //note that there are this.length - 1 line segments. note, won't round up on .005
					var nextColor = colorprefix + alpha.toString() + ')';
					canvasContext.save();
					canvasContext.beginPath();
					canvasContext.arc(point.x, point.y, 25, 0, Math.PI * 2, true);
					canvasContext.fillStyle = nextColor;
					canvasContext.fill();
					canvasContext.restore();
				}
				break;
			}
			case 'line':{
				canvasContext.save();
				canvasContext.beginPath();
				canvasContext.lineWidth = 15;
				canvasContext.moveTo(this.vertices[0].x,this.vertices[0].y);
				var colorprefix = 'rgba(255,255,255, ';
				var previousColor = 'rgba(255,255,255, 1)';
				for (var i = 1; i < this.length; i++){
					var lastPoint = this.vertices[i-1];
					var point = this.vertices[i];
					var gradient = canvasContext.createLinearGradient(lastPoint.x, lastPoint.y, point.x, point.y);
					var alpha = Math.round(100 * (this.length - 1 - i) / (this.length - 1)) / 100; //note that there are this.length - 1 line segments. note, won't round up on .005
					var nextColor = colorprefix + alpha.toString() + ')';
					gradient.addColorStop(0, previousColor); //start color
					gradient.addColorStop(1, nextColor); //end color
					previousColor = nextColor;
					canvasContext.strokeStyle = gradient;
					canvasContext.lineTo(point.x, point.y);
					canvasContext.stroke();
				}
				canvasContext.restore();
				break;
			}
		}
	}
	*/
