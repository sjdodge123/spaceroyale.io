function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
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
	for(var player in shipList){
		count++;
	}
	return count;
}