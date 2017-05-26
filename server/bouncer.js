var database = require('./database.js');
var messenger = require('./messenger.js');
var utils = require('./utils.js');

var userRegex = new RegExp('^[a-zA-Z0-9_-]{3,15}$');
var passRegex = new RegExp('^[a-zA-Z0-9_-]{6,20}$');
var gameNameRegex = new RegExp('^[a-zA-Z0-9_-]{3,10}$');

exports.checkAuth = function(creds){
	checkAuth(creds);
}
exports.checkReg = function(creds){
	utils.logToFile('logs/reg_attempts.txt',creds.username + "(" + creds.address + ")");
	checkReg(creds);
}

function checkAuth(creds){
	if(invalid(creds.username,creds.password)){
		messenger.messageUser(creds.id,"unsuccessfulAuth",{reason:"Invalid attempt"});
		return;
	}
	database.lookupUser(authCallback,creds);
}

function invalid(user,pass){
    if(user == null || user == ""){
        return true;
    }
    if(pass == null || pass == ""){
        return true;
    }
    if(userRegex.test(user) == false){
        return true;
    }
    if(passRegex.test(pass) == false){
        return true;
    }
}

function authCallback(result,params){
	if(result == undefined){
		messenger.messageUser(params.id,'unsuccessfulAuth',{reason:"Player not found"});
		return;
	}
	messenger.messageUser(params.id,'successfulAuth',result[0]);
}

function checkReg(creds){
	if(simpleChecks(creds)){
		return;
	}
	database.createUser(regCallback,creds);
}

function simpleChecks(creds){
	var user = creds.username;
	var pass = creds.password;
	var gameName = creds.gamename;

	if(user == null || user == ""){
		messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"User is empty"});
        return true;
    }
    if(userRegex.test(user) == false){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"User is invalid"});
        return true;
    }
    if(pass == null || pass == ""){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"Password is empty"});
        return true;
    }
    if(passRegex.test(pass) == false){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"Password is invalid"});
        return true;
    }
    if(gameName == null || gameName == ""){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"Callsign is empty"});
        return true;
    }
    if(gameNameRegex.test(gameName) == false){
        messenger.messageUser(creds.id,'unsuccessfulReg',{reason:"Callsign is invalid"});
        return true;
    }
    return false;
}

function regCallback(result,params){
	if(result.insertId == undefined){
		messenger.messageUser(params.id,'unsuccessfulReg',{reason:"Failed to register"});
		return;
	}
	database.addAuthedUser(params.id,result.insertId);
	messenger.messageUser(params.id,'successfulReg',params.player);
}
