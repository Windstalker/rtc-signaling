module.exports = (function () {
	var engine = require('engine.io');
	var Socket = engine.Socket;

	Socket.prototype.sendJSON = function (obj) {
		try {
			var stringified = JSON.stringify(obj);
			this.send(stringified);
		} catch (e) {
			log('JSON message stringify failed');
		}
	};

	var SignalServer = function (p) {
		this.port = p || 3000;
		this.users = {};
		this.server = engine.listen(this.port);

		log('Signal Server start listening on port: ' + this.port);

		this.socketHandlers = {
			"user.login": "userLogin",
			"user.logout": "userLogout",
			"user.msg.public": "userPublicMsgSend",
			"user.msg.private": "userPrivateMsgSend",
			"user.list.users": "sendUsersList"
		};

		this.attachEvents();

		return this;
	};

	SignalServer.prototype.attachEvents = function () {
		var socketHandlers = this.socketHandlers;
		var server = this.server;
		var self = this;

		server.on('connection', function (socket) {
			var socketsCount = this.clientsCount;

			log('Connection opened: ' + socket.id);
			log('Connections count: ' + socketsCount);

			socket.on('message', function (data) {
				log("Received command from " + socket.id);
				var parsed = null,
					callbackName = '';

				try {
					parsed = JSON.parse(data);
					callbackName = socketHandlers[parsed.type];
					if (parsed && callbackName) {
						self[callbackName](socket, parsed);
					} else {
						log("Unknown command type");
					}
				} catch (e) {
					log("Command message parse error");
					throw e;
				}
			});

			socket.on('close', function () {
				if (self.users.hasOwnProperty(this.id)) {
					self.userLogout(this);
				}
				log('Connection closed: ' + socket.id);
				log('Connections count: ' + socketsCount);
			});
		});
	};

	SignalServer.prototype.broadcast = function () {
		var sockets = this.server.clients;
		var data = arguments[0];
		var cb = typeof arguments[1] === 'function' && arguments[1] || function () {};
		var excluded = arguments.length === 2 && arguments[1] instanceof Array && arguments[1] ||
			arguments[2] ||
			[];
		for (var i in sockets) {
			if (sockets.hasOwnProperty(i) && excluded.indexOf(sockets[i].id) < 0) {
				sockets[i].sendJSON(data, cb);
			}
		}
	};

	SignalServer.prototype.userLogin = function (client, data) { // user tries to login to server
		var users = this.users,
			username = data["username"];

		log('Login request received from ' + client.id);
		log(username + " joined the room");

		users[client.id] = username;

		client.sendJSON({
			type: "user.login.success",
			username: username
		});

		this.broadcast({
			type: "user.join",
			username: username
		});

//		this.sendUsersList.call(this, client); // sending current userlist to new logged user
		this.broadcastUsersList(); // sending current userlist to all connected clients
	};

	SignalServer.prototype.userLogout = function (client) { // user tries to logout from server
		var users = this.users;

		log('Logout request received from ' + client.id);
		if (users.hasOwnProperty(client.id)) {
			delete users[client.id];
		}
	};

	SignalServer.prototype.getUserList = function () {
		var users = this.users;
		var list = [];
		for (var i in users) {
			if (users.hasOwnProperty(i)) {
				list.push(users[i]);
			}
		}
		return list;
	};

	SignalServer.prototype.broadcastUsersList = function () {
		var signalServer = this;
		signalServer.broadcast({
			type: "user.list",
			usernames: signalServer.getUserList()
		});
	};

	SignalServer.prototype.sendUsersList = function (client) {
		var users = this.users;
		var signalServer = this;

		log('List request from ' + client.id);
		if (users.hasOwnProperty(client.id)) {
			client.sendJSON({
				type: "user.list",
				usernames: signalServer.getUserList()
			});
		}
	};

	SignalServer.prototype.userPublicMsgSend = function (client, data) {
		var users = this.users,
			signalServer = this;

		log('Public message from ' + client.id);
		log(data["text"]);
		if (users.hasOwnProperty(client.id)) {
			signalServer.broadcast(data, !data["returnMessage"] && client.id);
		}
	};

	SignalServer.prototype.userPrivateMsgSend = function (client, data) {
		var users = this.users;
		var server = this.server;

		for (var i in users) {
			if (users.hasOwnProperty(i) && users[i] === data["username"]) {
				log('Private message from ' + client.id + " to " + i);
				log(data["text"]);

				server.clients[i].send(data);
				if (data["returnMessage"] !== false) {
					client.sendJSON(data);
				}
			}
		}
	};

	function log(obj) {
		console.log(Date.now() + ' ms : ' + obj);
	}

	return SignalServer;
})();