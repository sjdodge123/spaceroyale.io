
function clientConnect(name) {
	var server = io();

	server.on('welcome', function(){
		console.log("Connected to server");
		server.emit("gotit",name);
	});

	server.on("playerJoin", function(name){
		console.log(name + " has joined the battle");
	});
	
   	return server;
}