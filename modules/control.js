var socket = require("./socket");

var io = null;
var players = {};
var waitingPlayer = null;
function connectingDouble(black, white){
	white.socket.emit("connectPlayer", {
		id: black.id,
		name: black.name,
		color: "black"
	});
	black.socket.emit("connectPlayer", {
		id: white.id,
		name: white.name,
		color: "white"
	});
	black.enemy = white;
	white.enemy = black;
	black.action = true;
	white.action = false;
	white.step = black.step = 0;
}
function sendMessage(player, type, data){
	var socket = player.socket;
	socket.emit(type, data);
}
function doAction(player, data){
	if(player.action == false){
		sendMessage(player, "notice", {
			errno: 0,
			info: "还未轮到您下子"
		});
		return;
	}
	
	var enemy = player.enemy;
	enemy.action = true;
	player.step ++;
	enemy.step = player.step;
	sendMessage(enemy, "action", {
		id: player.id,
		step: player.step,
		i: data.i,
		j: data.j
	});
}
function addListener(){
	io.sockets.on('connection', function (socket) {
		socket.emit("create", {
			id: socket.id
		});
		players[socket.id] = {
			socket: socket,
			id: socket.id
		};
		socket.on('request', function(data){
			if(players[socket.id].running){
				sendMessage(players[socket.id], "notic", {
					errno: 1,
					info: "请求已经发出过，请不要重复请求！"
				});
				return;
			}
			players[socket.id].name = data.name || socket.id;
			players[socket.id].running = true;
			if(waitingPlayer){
				connectingDouble(players[waitingPlayer], players[socket.id]);
				waitingPlayer = null;
			}else{
				waitingPlayer = socket.id;
			}
		});
		socket.on('action', function(data){
			doAction(players[socket.id], data);
		});
		socket.on('restart', function(data){
		});
		socket.on('rename', function(data){
			if(players[socket.id]){
				players[socket.id].name = data.name;
			}
		});
		socket.on('chat', function(data){
			broad('chat', {
				name: players[socket.id].name,
				info: data.info
			});
		});
		socket.on('disconnect', function (){
			if(socket.id == waitingPlayer){
				waitingPlayer = null;
			}
			var enemy = players[socket.id].enemy;
			if(enemy){
				enemy.running = false;
				sendMessage(enemy, 'notice', {
					error: 2,
					info: "对方已经下线 请重新连接"
				});
			}
			players[socket.id] = null;
		});
	});

}

function broad(type, data){
	io.sockets.emit(type, data)
}

exports.start = function(app){
	io = socket.createSocket(app);
	addListener();
}
