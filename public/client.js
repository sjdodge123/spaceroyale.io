
function clientConnect() {
	var socket = io();
	console.log("Connected to server");
   	return socket;
}