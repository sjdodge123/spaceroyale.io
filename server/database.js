var mysql = require('mysql');
var utils = require('./utils.js');
var c = utils.loadConfig();
var messenger = require('./messenger.js');
var bcrypt = require('bcrypt');
var authedUsers = {};

exports.addAuthedUser = function(id,user_id){
	authedUsers[id] = user_id;
}

exports.removeAuthedUser = function(id){
	delete authedUsers[id];
}

exports.findAuthedUser = function(id){
	return authedUsers[id];
}

exports.recordShip = function(id,ship){
	var user_id = authedUsers[id];
	if(user_id == null){
		return;
	}
	var params = {};
	params.id = id;
	params.user_id = user_id;
	params.kills = ship.killList.length;
	if(ship.killedBy == null){
		params.wins = 1;
		params.deaths = 0;
	} else{
		params.deaths = 1;
		params.wins = 0;
	}
	params.exp = 10;
	params.games = 1;
	updatePlayer(updatePlayerScreen,params);
}

exports.createUser = function(callback,params){
	var user = {user_name:params.username,password:generateHash(params.password)};
	var player = {user_id:null,total_exp:0,total_kills:0,total_wins:0,game_name:params.gamename,skin_id:0,total_deaths:0,total_games:0};
	createConnection();
	database.connect(function(e){
		if(e){
			utils.logError(e);
			return;
		}
		database.query("SELECT * FROM queenanne.user WHERE user_name LIKE ?",params.username,function(e,result){
			if(e){
				utils.logError(e);
				return;
			}
			if(result.length != 0){
				messenger.messageUser(params.id,'unsuccessfulReg',{reason:"Username is taken"});
				return;
			}
			database.query("INSERT INTO queenanne.user SET ?",user,function(e,result){
				if(e){
					utils.logError(e);
					return;
				}
				player.user_id = result.insertId;
				database.query("INSERT INTO queenanne.player SET ?",player,function(e,result){
					if(e){
						utils.logError(e);
						return;
					}
					params.player = player;
					authedUsers[params.id] = player.user_id;
					result.insertId = player.user_id;
					callback(result,params);
					database.end();
				});
			});
		});
		
	});
}

exports.lookupUser = function(callback,params){
	createConnection();
	database.connect(function(e){
		if(e){
			utils.logError(e);
			return;
		}
		database.query("SELECT * FROM queenanne.user WHERE user_name LIKE ?",params.username,function(e,result){
			if(e){
				utils.logError(e);
				return;
			}
			if(result.length == 0){
				utils.logToFile('logs/auth_attempts.txt',"USERNAME_ERROR (" + params.address + ") " + params.username);
				messenger.messageUser(params.id,'unsuccessfulAuth',{reason:"User not found"});
				return;
			}
			if(!validPassword(params.password,result[0].password)){
				utils.logToFile('logs/auth_attempts.txt',"PASSWORD_ERROR (" + params.address + ") " +params.username);
				messenger.messageUser(params.id,'unsuccessfulAuth',{reason:"Password incorrect"});
				return;
			}

			authedUsers[params.id] = result[0].user_id;
			params.user_id = result[0].user_id;
			
			database.query("SELECT * FROM queenanne.player WHERE user_id LIKE ?",params.user_id,function(e,result){
				if(e){
					utils.logError(e);
					return;
				}
				callback(result,params);
				database.end();
			});
		});
	});
}

function updatePlayer(callback,params){
	createConnection();
	database.connect(function(e){
		if(e){
			utils.logError(e);
			return;
		}
		database.query("UPDATE `queenanne`.`player` SET" +
		"`total_kills`=`total_kills`+"+params.kills+"," +
		"`total_deaths`=`total_deaths`+"+params.deaths+"," +
		"`total_wins`=`total_wins`+"+params.wins+"," +
		"`total_games`=`total_games`+"+params.games+"," +
		"`total_exp`=`total_exp`+"+params.exp+
		" WHERE `user_id` LIKE ?", params.user_id,function(e,result){
			if(e){
				utils.logError(e);
				return;
			}
			if(result.changedRows != 1){
				console.log(result);
				return;
			}
			database.query("SELECT * FROM queenanne.player WHERE user_id LIKE ?",params.user_id,function(e,result){
				if(e){
					utils.logError(e);
					return;
				}
				params.player = result[0];
				callback(result,params);
				database.end();
			});
		});
	});
}

function generateHash(password){
	return bcrypt.hashSync(password,bcrypt.genSaltSync(9));
}

function validPassword(givenPass,dbPass){
	return bcrypt.compareSync(givenPass,dbPass);
}

function updatePlayerScreen(result,params){
	messenger.messageUser(params.id,'profileUpdate',params.player);
}

function createConnection(){
	database = mysql.createConnection({
		host: c.sqlinfo.host,
		user: c.sqlinfo.user,
		password : c.sqlinfo.password,
		database : c.sqlinfo.database,
		debug : c.sqlinfo.debug
	});
}
