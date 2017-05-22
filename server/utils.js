var mailBoxList = {},
	roomMailList = {},
	io;

exports.build = function(mainIO){
	io = mainIO;
}

exports.getRandomInt = function(min,max){
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
};

exports.addMailBox = function(id,client){
	mailBoxList[id] = client;
}
exports.addRoomToMailBox = function(id,roomSig){
	roomMailList[id] = roomSig;
}
exports.removeRoomMailBox = function(id){
	delete roomMailList[id];
}

exports.removeMailBox = function(id){
	delete mailBoxList[id];
}
exports.getClient = function(id){
	return mailBoxList[id];
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
exports.messageUser = function(id,header,payload){
	mailBoxList[id].emit(header,payload);
}

exports.messageRoomBySig = function(sig,header,payload){
	io.to(sig).emit(header,payload);
}

exports.messageRoomByUserID = function(id,header,payload){
	io.to(roomMailList[id]).emit(header,message);
}









exports.sendEventMessageToPlayer = function(id,message){
	mailBoxList[id].emit("eventMessage",message);
}
exports.sendEventMessageToRoom = function(id,message){
	io.to(roomMailList[id]).emit("eventMessage",message);
}