var mysql = require('mysql');
var c = require('./config.json');
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

exports.createUser = function(callback,params){
	var user = {user_name:params.username,password:params.password};
	var player = {user_id:null,total_exp:0,total_kills:0,total_wins:0,game_name:params.gamename,skin_id:0};
	createConnection();
	database.connect(function(e){
		if(e){
			throw e;
		}
		database.query("SELECT * FROM queenanne.user WHERE user_name LIKE ?",params.username,function(e,result){
			if(e){
				throw e;
			}
			if(result.length != 0){
				utils.messageUser(params.id,'unsuccessfulReg',{reason:"Username is taken"});
				return;
			}
			database.query("INSERT INTO queenanne.user SET ?",user,function(e,result){
				if(e){
					throw e;
				}
				player.user_id = result.insertId;
				database.query("INSERT INTO queenanne.player SET ?",player,function(e,result){
					if(e){
						throw e;
					}
					params.player = player;
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
			throw e;
		}
		database.query("SELECT * FROM queenanne.user WHERE user_name LIKE ?",params.username,function(e,result){
			if(e){
				throw e;
			}
			if(result.length == 0){
				utils.messageUser(params.id,'unsuccessfulAuth',{reason:"User not found"});
				return;
			}
			if(result[0].password !== params.password){
				utils.messageUser(params.id,'unsuccessfulAuth',{reason:"Password incorrect"});
				return;
			}

			authedUserList[params.id] = result[0].user_id;
			params.user_id = result[0].user_id;
			
			database.query("SELECT * FROM queenanne.player WHERE user_id LIKE ?",params.user_id,function(e,result){
				if(e){
					throw e;
				}
				callback(result,params);
				database.end();
			});
		});
	});
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
