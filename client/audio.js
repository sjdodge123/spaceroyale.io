var gameMuted = false;
var playerJoinSound = new Audio("./sounds/player_join.wav");
var collision = new Audio("./sounds/collide_with_obj.wav");
var takeDamage = new Audio("./sounds/take_damage.wav");
var pistolShot = new Audio("./sounds/pistol_shot.wav");
var shipInitThrust = new Audio("./sounds/ship_init_thrust.wav");
var shipThrust = new Audio("./sounds/ship_thrust.wav");


var masterVolume = 1;

pistolShot.volume = .1 * masterVolume;
shipInitThrust.volume = .3 * masterVolume;
shipThrust.volume = .4 * masterVolume;
shipThrust.loop = true;

function playSound (sound) {
	if(!gameMuted){
		if(sound.currentTime > 0){
			sound.currentTime = 0;
		}
		sound.play();
	}
}

function playThrust(){
	if(!gameMuted){
		if(shipInitThrust.currentTime > 0){
			return;
		}
		shipThrust.play();
		shipInitThrust.play();
	}
}

function stopThrust(){
	if(!gameMuted){
		if(shipInitThrust.currentTime > 0){
			shipThrust.pause();
			shipInitThrust.pause();
			shipInitThrust.currentTime = 0;
		}
	}
}
