var mailBoxList = {};

exports.getRandomInt = function(min,max){
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
};

exports.addMailBox = function(id,client){
	mailBoxList[id] = client;
}
exports.removeMailBox = function(id){
	delete mailBoxList[id];
}

exports.getTotalPlayers = function(){
	var count = 0;
	for(var box in mailBoxList){
		count++;
	}
	return count;
}

exports.toastPlayer = function(id,message){
	mailBoxList[id].emit("toast",message);
}