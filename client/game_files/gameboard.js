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