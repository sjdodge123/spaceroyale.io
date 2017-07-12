function updateGameboard(){
	updateShips();
	updateItems();
	updateTradeShips();
}

function updateShips(){
	for(var id in shipList){
		var ship = shipList[id];
		if (ship.spriteAngle < 359){
			ship.spriteAngle += ship.rotationRate;
		}
		else{
			ship.spriteAngle = 0;
		}
	}
}

function updateItems(){
	var item;
	for(var sig in itemList){
		item = itemList[sig];
		if(item.name == "HPItem"){
			continue;
		}
		var timeLeft = config.baseItemDecayRate-((Date.now()-item.dropDate)/1000);
		timeLeft = timeLeft.toFixed(1);
		if(timeLeft <= config.baseItemDecayRate*.33){
			if(timeLeft % 0.5 == 0){
				item.flash = true;
			} else {
				item.flash = false;
			}
			continue;
		}

		if(timeLeft <= config.baseItemDecayRate*.66){
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

function terminateItem(sig){
	if(itemList[sig] != undefined){
		delete itemList[sig];
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
			shipList[ship[0]] = {};
			shipList[ship[0]].isHiding = false;
			shipList[ship[0]].spriteAngle = 0;
			shipList[ship[0]].rotationRate = 1;
			shipList[ship[0]].kills = 0;
			shipList[ship[0]].health = config.playerBaseHealth;
			shipList[ship[0]].radius = config.playerBaseRadius;
			shipList[ship[0]].id = ship[0];
			shipList[ship[0]].x = ship[1];
			shipList[ship[0]].y = ship[2];
			shipList[ship[0]].color = ship[3];
			shipList[ship[0]].weapon = {}
			shipList[ship[0]].weapon.angle = ship[4];
			shipList[ship[0]].weapon.name = ship[5];
			shipList[ship[0]].weapon.level = ship[6];
			shipList[ship[0]].weapon.cooldown = ship[7];
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
		shipList[ship[0]] = {};
		shipList[ship[0]].isHiding = false;
		shipList[ship[0]].spriteAngle = 0;
		shipList[ship[0]].rotationRate = 1;
		shipList[ship[0]].kills = 0;
		shipList[ship[0]].health = config.playerBaseHealth;
		shipList[ship[0]].radius = config.playerBaseRadius;
		shipList[ship[0]].id = ship[0];
		shipList[ship[0]].x = ship[1];
		shipList[ship[0]].y = ship[2];
		shipList[ship[0]].color = ship[3];
		shipList[ship[0]].weapon = {}
		shipList[ship[0]].weapon.angle = ship[4];
		shipList[ship[0]].weapon.name = ship[5];
		shipList[ship[0]].weapon.level = ship[6];
		shipList[ship[0]].weapon.cooldown = ship[7];
	}
}

function spawnAIShips(payload){
	var ship = payload;
	payload = JSON.parse(payload);
	for(var i=0;i<payload.length;i++){
		var ship = payload[i];
		if(shipList[ship[0]] == null){
			shipList[ship[0]] = {};
			shipList[ship[0]].isHiding = false;
			shipList[ship[0]].spriteAngle = 0;
			shipList[ship[0]].rotationRate = 1;
			shipList[ship[0]].kills = 0;
			shipList[ship[0]].health = config.playerBaseHealth;
			shipList[ship[0]].radius = config.playerBaseRadius;
			shipList[ship[0]].id = ship[0];
			shipList[ship[0]].x = ship[1];
			shipList[ship[0]].y = ship[2];
			shipList[ship[0]].color = ship[3];
			shipList[ship[0]].weapon = {}
			shipList[ship[0]].weapon.angle = ship[4];
			shipList[ship[0]].weapon.name = ship[5];
			shipList[ship[0]].weapon.level = ship[6];
			shipList[ship[0]].weapon.cooldown = ship[7];
			shipList[ship[0]].AIName = ship[8];
		}
	}
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
		}
	}
}

function spawnItem(packet){
	packet = JSON.parse(packet);
	itemList[packet[0]] = {};
	itemList[packet[0]].radius = config.baseItemRadius;
	itemList[packet[0]].dropDate = Date.now();
	itemList[packet[0]].flash = false;
	itemList[packet[0]].sig = packet[0];
	itemList[packet[0]].x = packet[1];
	itemList[packet[0]].y = packet[2];
	itemList[packet[0]].name = packet[3];
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
		}
	}

}

function equipItem(packet){
	packet = JSON.parse(packet);
	var name = packet[1];
	var level = packet[2];

	if(name == "ShieldItem"){
		shipList[packet[0]].shield = {};
		shipList[packet[0]].shield.level = level;
		return;
	}
	if(name == "BlasterItem"){
		shipList[packet[0]].weapon.name = "Blaster";
		shipList[packet[0]].weapon.level = level;
	}
	if(name == "PhotonCannonItem"){
		shipList[packet[0]].weapon.name = "Photon Cannon";
		shipList[packet[0]].weapon.level = level;
	}
	if(name == "MassDriverItem"){
		shipList[packet[0]].weapon.name = "Mass Driver";
		shipList[packet[0]].weapon.level = level;
	}
}

function updateItem(packet){
	packet = JSON.parse(packet);
	var name = packet[1];
	var level = packet[2];

	if(name == "ShieldItem"){
		shipList[packet[0]].shield.level = level;
		return;
	}
	shipList[packet[0]].weapon.level = level;
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
	var id,ship,weaponName,weaponLevel,numBullets,i,bullet;
	payload = JSON.parse(payload);
	id = payload[0];
	ship = shipList[id];
	weaponName = payload[1];
	weaponLevel = payload[2];
	numBullets = payload[3];

	for(i=4;i<numBullets+4;i++){
		bullet = payload[i];
		if(bulletList[bullet[0]] == null){
			bulletList[bullet[0]] = {};
			bulletList[bullet[0]].velX = 0;
			bulletList[bullet[0]].velY = 0;
			bulletList[bullet[0]].owner = id;
			bulletList[bullet[0]].x = bullet[1];
			bulletList[bullet[0]].y = bullet[2];
			bulletList[bullet[0]].angle = bullet[3];
			bulletList[bullet[0]].speed = bullet[4];
			bulletList[bullet[0]].width = bullet[5];
			bulletList[bullet[0]].height = bullet[6];

			setTimeout(terminateBullet,config.bulletLifetime*1000 + 200,bullet[0]);
		}
	}
	if(id == myID){
		lastFired = new Date();
	}
	if(camera.inBounds(ship)){
		if(weaponName == "Blaster"){
        	playSound(blasterShot);
    	}
    	if(weaponName == "PhotonCannon"){
        	playSound(photonCannonShot);
    	}
    	if(weaponName == "MassDriver"){
    		if(weaponLevel == 3){
    			playSound(massDriverShot2);
    		} else{
    			playSound(massDriverShot1);
    		}
    	}
	}
}