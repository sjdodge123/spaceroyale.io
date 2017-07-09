function updateGameboard(){
	updateBullets();
}

function updateBullets(){
	for(var sig in bulletList){
		var bullet = this.bulletList[sig];
		bullet.velX = Math.cos((bullet.angle+90)*(Math.PI/180))*bullet.speed;
		bullet.velY = Math.sin((bullet.angle+90)*(Math.PI/180))*bullet.speed;
		bullet.x += bullet.velX * deltaTime;
		bullet.y += bullet.velY * deltaTime;
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