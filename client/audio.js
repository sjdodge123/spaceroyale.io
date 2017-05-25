var gameMuted = false;
var playerJoinSound = new Audio("./sounds/player_join.wav");
var collision = new Audio("./sounds/collide_with_obj.wav");
var takeDamage = new Audio("./sounds/take_damage.wav");
var pistolShot = new Audio("./sounds/pistol_shot.wav");
var shipInitThrust = new Audio("./sounds/ship_init_thrust.wav");
var shipThrust = new Audio("./sounds/ship_thrust.wav");
var backgroundMusic = new Audio('./sounds/Intergalactic.mp3');
var gameStartMusic = new Audio('./sounds/Play_Ball.mp3');


var masterVolume = .5;

pistolShot.volume = .1 * masterVolume;
collision.volume = .5 * masterVolume;
playerJoinSound.volume = .5 * masterVolume;
shipInitThrust.volume = .3 * masterVolume;
shipThrust.volume = .4 * masterVolume;
backgroundMusic.volume = .1 * masterVolume;
gameStartMusic.volume = .1 *masterVolume;

shipThrust.loop = true;

function playSound (sound) {
	if(!gameMuted){
		if(sound.currentTime > 0){
			sound.currentTime = 0;
		}
		sound.play();
	}
}

function stopSound(sound){
	if(!gameMuted){
		sound.pause();
		if(sound.currentTime > 0){
			sound.currentTime = 0;
		}
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
