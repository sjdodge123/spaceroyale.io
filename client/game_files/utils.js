function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
function getRandomInt(min, max) {
 	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getPlayerListCount(){
	var count = 0;
	for(var player in playerList){
		count++;
	}
	return count;
}

function getShipListCount(){
	var count = 0;
	for(var ship in shipList){

		count++;
	}
	return count;
}

function generateSig(activeList){
		var sig = getRandomInt(0,99999);
		if(activeList[sig] == null || activeList[sig] == undefined){
			return sig;
		}
		return generateSig(activeList);
}	
function getMag(x,y){
	return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
}

function getMagSquared(x,y){
	return Math.pow(x, 2) + Math.pow(y, 2);
}