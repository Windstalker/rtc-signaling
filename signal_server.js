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

		this.chatRequests = {
			"user.login": "userLogin",
			"user.logout": "userLogout",
			"user.msg.public": "sendUserPublicMsg",
			"user.msg.private": "sendUserPrivateMsg",
			"user.list.users": "sendUsersList"
		};

		this.chatEvents = {
			"user.status.change": "onUserStatusChange",
			"user.login": "onUserLogin",
			"user.logout": "onUserLogout",
			"msg.public": "onPublicMsg",
			"msg.private": "onPrivateMsg"
		};

		this.attachEvents();

		return this;
	};

	SignalServer.prototype.attachEvents = function () {
		var chatRequests = this.chatRequests;
		var chatEvents = this.chatEvents;
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
					callbackName = chatRequests[parsed.type];
					if (parsed && callbackName) {
						parsed.sender = self.users[socket.id];
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

		for (var i in chatEvents) {
			var handlerName = chatEvents[i];
			if (chatEvents.hasOwnProperty(i) && typeof self[handlerName] === 'function') {
				server.on(i, self[chatEvents[i]].bind(self));
			}
		}
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

		if (!users.hasOwnProperty(client.id)) {
			users[client.id] = username;
			client.sendJSON({
				type: "user.login.success",
				username: username
			});

			log(username + " joined the room");

			this.server.emit("user.login", client);
			this.server.emit("user.status.change", client, "join");
		} else {
			client.sendJSON({
				type: "user.login.error",
				username: username
			});

			log("Error: " + client.id + " has already logged in");

			// TODO: Separate rename functionality
			log(client.id + " committed rename request");

			users[client.id] = username;

			this.server.emit("user.status.change", client, "rename");
		}

	};

	SignalServer.prototype.userLogout = function (client) { // user tries to logout from server
		var users = this.users;
		log('Logout request received from ' + client.id);

		if (users.hasOwnProperty(client.id)) {
			var username = users[client.id];
			client.sendJSON({
				type: "user.logout.success",
				username: username
			});

			delete users[client.id];

			this.server.emit("user.status.change", client, "left", username);
			this.server.emit("user.logout", client);
		} else {
			client.sendJSON({
				type: "user.logout.error"
			});

			log("Error: " + client.id + " has never logged before");
		}
	};

	SignalServer.prototype.onUserStatusChange = function (client, status, username) {
		var users = this.users;
		this.broadcast({
			type: "user." + status,
			username: username || users[client.id]
		});
		this.broadcastUsersList();
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

	SignalServer.prototype.sendUserPublicMsg = function (client, data) {
		var users = this.users,
			signalServer = this;

		if (users.hasOwnProperty(client.id)) {
			log('Public message from ' + client.id);
			log(data["text"]);
			signalServer.broadcast(data, !data["returnMessage"] && client.id);
			this.server.emit("msg.public", client, data);
		}
	};

	SignalServer.prototype.sendUserPrivateMsg = function (client, data) {
		var users = this.users;
		var server = this.server;

		for (var i in users) {
			if (users.hasOwnProperty(i) && users[i] === data["receiver"]) {
				log('Private message from ' + client.id + " to " + i);
				log(data["text"]);
				server.clients[i].sendJSON(data);
				if (data["returnMessage"] !== false) {
					client.sendJSON(data);
				}
				this.server.emit("msg.private", client, i, data);
			}
		}
	};

	function log(obj) {
		console.log(Date.now() + ' ms : ' + obj);
	}

	return SignalServer;
})();