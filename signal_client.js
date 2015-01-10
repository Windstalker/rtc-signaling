var ChatApp = function (opts) {
	var app = this;
	var Socket = ClientSocket;
	var options = opts || {};

	app.reconnectTimer = null;
	app.reconnectCount = 0;
	app.defaultOptions = {
		host: '192.168.13.244',
		port: '3000',
		reconnectTimeout: 2000,
		reconnectMaxTries: 10,
		alwaysReconnect: false
	};
	app.options = {};

	for (var i in app.defaultOptions) {
		app.options[i] = app.defaultOptions[i];
	}

	for (i in options) {
		app.options[i] = options[i];
	}

	app.username = '';
	app.userList = [];
	app.msgTemplates = {
		pm: /^\\pm\s(\S+)\s(.*)/,
		me: /^\\me\s(.*)/
	};
	app.msgHandlers = {
		"user.join": function (data) {
			app.log(data["username"] + " joined the room");
		},
		"user.left": function (data) {
			app.log(data["username"] + " left the room");
		},
		"user.list": function (data) {
			app.userList = data.usernames;
			app.renderUserList();
		},
		"user.login.success": function (data) {
			app.username = data.username;
		},
		"user.login.error": function () {
			app.username = "";
		},
		"user.logout.success": function () {
			app.username = "";
		},
		"user.logout.error": function () {

		},
		"user.msg.public": function (data) {
			app.log(data.sender + ': ' + data.text);
		},
		"user.msg.private": function (data) {
			app.log(data.sender + ' --> ' + data.receiver + ': ' + data.text);
		}
	};

	this.socket = new Socket(this.options);
	this.view = new ChatView(app);

	this.attachSocketListeners();

	return this;
};
ChatApp.prototype.log = function (obj) {
	this.view.log(obj);
};
ChatApp.prototype.logClear = function () {
	this.view.logClear();
};
ChatApp.prototype.attachSocketListeners = function () {
	var app = this;
	this.socket.on('open', function () {
		app.log('connection opened');
		app.requestUserList();
	});

	this.socket.on('error', function () {
		app.log('connection error');
	});

	this.socket.on('close', function () {
		app.clearUserList();
		app.log('connection closed');
	});
	this.socket.on('message', function () {
		app.onMessage.apply(app, arguments);
	});
};
ChatApp.prototype.onMessage = function (data) {
	var parsed = null;
	var app = this;
	try {
		parsed = JSON.parse(data);
		if (parsed && app.msgHandlers.hasOwnProperty(parsed.type)) {
			app.msgHandlers[parsed.type](parsed);
		} else {
			app.log("Unknown message type");
		}
	} catch (e) {
		app.log("Message parse error");
		throw e;
	}
};
ChatApp.prototype.connect = function () {
	if (!this.socket.hasOpenState()) {
		console.log('connecting');
		this.socket.open();
	}
};
ChatApp.prototype.disconnect = function () {
	if (this.socket.hasOpenState()) {
		console.log('disconnecting');
		this.socket.close();
	}
	this.socket.stopTimer();
};
ChatApp.prototype.requestLogin = function (username) {
	if (this.socket.hasOpenState() && username && username.length) {
		this.socket.sendJSON({
			type: 'user.login',
			username: username
		});
	}
};
ChatApp.prototype.requestLogout = function () {
	if (this.socket.hasOpenState()) {
		this.socket.sendJSON({
			type: 'user.logout'
		});
	}
};
ChatApp.prototype.requestUserList = function () {
	this.socket.sendJSON({
		type: "user.list"
	});
};
ChatApp.prototype.renderUserList = function () {
	this.view.renderUserList();
};
ChatApp.prototype.clearUserList = function () {
	this.view.clearUserList();
	this.userList = [];
};
ChatApp.prototype.sendChatMsg = function (msg) {
	var app = this;
	var rexp = app.msgTemplates.pm;
	if (msg.length > 0 && app.socket.hasOpenState()) {
		var privParse = msg.match(rexp);
		var isPrivMsg = !!privParse;
		var body = {
			type: "user.msg." + (isPrivMsg ? 'private' : 'public'),
			text: isPrivMsg ? privParse[2] : msg
		};
		if (isPrivMsg) {
			body.receiver = privParse[1];
		}
		app.socket.sendJSON(body);
	}
};