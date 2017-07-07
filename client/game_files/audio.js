var gameMuted = false;
var playingSounds = [];
var playerJoinSound = new Audio("./sounds/player_join.wav");
var collision = new Audio("./sounds/collide_with_obj.wav");
var takeDamage = new Audio("./sounds/take_damage.wav");

var timerTick = new Audio("./sounds/timer_tick.wav");
var timerEnd = new Audio("./sounds/timer_End.wav");

var blasterShot = new Audio("./sounds/blaster_shot.wav");
var photonCannonShot = new Audio("./sounds/photonCannon_shot.wav");
var massDriverShot1 = new Audio("./sounds/massdriver_shot1.wav");
var massDriverShot2 = new Audio("./sounds/massdriver_shot2.wav");

var shotAsteroid = new Audio("./sounds/shot_asteroid.wav");
var shotPlayer = new Audio("./sounds/shot_player.wav");

var shipInitThrust = new Audio("./sounds/ship_init_thrust.wav");
var shipThrust = new Audio("./sounds/ship_thrust.wav");
var youDied = new Audio("./sounds/you_died.wav");
var shipDeath = new Audio("./sounds/ship_death.wav");
var backgroundMusic = new Audio('./sounds/Intergalactic.mp3');
var gameStartMusic = new Audio('./sounds/Play_Ball.mp3');


var masterVolume = 1;

timerTick.volume *= .1 *masterVolume;
timerEnd.volume *= .1 * masterVolume;

playerJoinSound.volume *= .1 * masterVolume;
collision.volume *= .1 * masterVolume;
takeDamage.volume *= .5 * masterVolume;

blasterShot.volume *= .1 * masterVolume;
photonCannonShot.volume *= .3 * masterVolume;
massDriverShot1.volume *= .2 *masterVolume;
massDriverShot2.volume *= .25 * masterVolume;

shotAsteroid.volume *= .2 * masterVolume;
shotPlayer.volume *= .3 * masterVolume;

shipInitThrust.volume *= .3 * masterVolume;
shipThrust.volume *= .4 * masterVolume;
youDied.volume *= .3 * masterVolume;
shipDeath.volume *= .3 * masterVolume;

backgroundMusic.volume *= .1 * masterVolume;
gameStartMusic.volume *= .05 *masterVolume;
shipThrust.loop = true;

function playSound (sound) {
	playingSounds.push(sound);
	if(!gameMuted){
		if(sound.currentTime > 0){
			sound.currentTime = 0;
		}
		sound.play();
	}
}
function playSoundAfterFinish(sound){
	playingSounds.push(sound);
	if(!gameMuted){
		if(sound.currentTime > 0 && !sound.ended){
			return;
		}else{
			sound.currentTime = 0;
		}
		sound.play();
	}
}

function stopSound(sound){
	var index = playingSounds.indexOf(sound);
	if(index != -1){
		playingSounds.splice(index,1);
	}
	if(!gameMuted){
		sound.pause();
		if(sound.currentTime > 0){
			sound.currentTime = 0;
		}
	}
}

function stopAllSounds(){
	for(var i=0;i<playingSounds.length;i++){
		playingSounds[i].pause();
	}
}

function resumeAllSounds(){
	for(var i=0;i<playingSounds.length;i++){
		playingSounds[i].play();
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
