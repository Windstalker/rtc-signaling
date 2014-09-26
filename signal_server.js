var PORT = 3000;
var engine = require('engine.io');
var Socket = engine.Socket;
var server = engine.listen(PORT);
var usernames = {};

log('Signal Server start listening on port: ' + PORT);

Socket.prototype.sendJSON = function (obj) {
	var stringified = JSON.stringify(obj);
	this.send(stringified);
};

Socket.prototype.broadcast = function (data, cb, me) {
	var sockets = this.server.clients;
	var toMyself = arguments.length === 2 && typeof cb !== 'function' && cb || me || false;
	for (var i in sockets) {
		if (sockets[i].id !== this.id || toMyself) {
			sockets[i].sendJSON(data, cb);
		}
	}
};

var socketHandlers = {
	"user.login": function (client, data) { // user tries to log into chat room
		log('Login request received from ' + client.id);
		usernames[client.id] = data["username"];

		this["user.list.users"].call(this, client); // sending current userlist to new logged user
	},
	"user.logout": function (client) {
		log('Logout request received from ' + client.id);
		if (usernames.hasOwnProperty(client.id)) {
			delete usernames[client.id];
		}
	},
	"user.msg.public": function (client, data) {
		log('Public message from ' + client.id);
		log(data["text"]);
		if (usernames.hasOwnProperty(client.id)) {
			client.broadcast(data, data["returnMessage"] !== false);
		}
	},
	"user.msg.private": function (client, data) {
		for (var i in usernames) {
			if (usernames.hasOwnProperty(i) && usernames[i] === data["username"]) {
				log('Private message from ' + client.id + " to " + i);
				log(data["text"]);

				server.clients[i].send(data);
				if (data["returnMessage"] !== false) {
					client.sendJSON(data);
				}
			}
		}
	},
	"user.list.users": function (client) {
		log('List request from ' + client.id);
		if (usernames.hasOwnProperty(client.id)) {
			client.sendJSON({
				type: "list.users",
				usernames: usernames
			});
		}
	}
};

server.on('connection', function (socket) {
	var sockets = this.clients;
	var socketsCount = this.clientsCount;

	log('Connection opened: ' + socket.id);
	log('Connections count: ' + socketsCount);

	socket.on('message', function (data) {
		log("Received command from " + socket.id);
		var parsed = null;

		try {
			parsed = JSON.parse(data);
			if (parsed && socketHandlers.hasOwnProperty(parsed.type)) {
				socketHandlers[parsed.type](socket, parsed);
			} else {
				log("Unknown command type");
			}
		} catch (e) {
			log("Command message parse error");
			throw e;
		}
	});

	socket.on('close', function () {
		log('Connection closed: ' + socket.id);
		log('Connections count: ' + socketsCount);
	});
});

function getUserList() {
	var list = [];
	for (var i in usernames) {
		if (usernames.hasOwnProperty(i)) {
			list.push(i);
		}
	}
	return list;
}

function log(obj) {
	console.log(Date.now() + ' ms : ' + obj);
}