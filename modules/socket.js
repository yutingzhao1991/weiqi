var socketio = require('socket.io');


exports.createSocket = function(app){
	var io = socketio.listen(app, { log: false });
	return io;
};

