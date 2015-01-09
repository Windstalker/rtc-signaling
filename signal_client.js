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

	app.elements = {	// elements
		login : document.getElementById('login'),
		logout : document.getElementById('logout'),
		connect : document.getElementById('connect'),
		disconnect : document.getElementById('disconnect'),
		getUsers : document.getElementById('get_users'),

		msg : document.getElementById('msg'),
		send : document.getElementById('send'),

		userListEl : document.getElementById('user_list'),
		loggerEl : document.getElementById('logger'),
		clearLogBtn : document.getElementById('clear')
	};
	app.domListeners = {
		"click #connect": function () {
			if (!app.socket.hasOpenState()) {
				console.log('connecting');
				app.socket.open();
			}
		},
		"click #disconnect": function () {
			if (app.socket.hasOpenState()) {
				console.log('disconnecting');
				app.socket.close();
			}
			app.socket.stopTimer();
		},
		"click #login": function () {
			var username = window.prompt('Enter your username');
			if (app.socket.hasOpenState() && username && username.length) {
				app.socket.sendJSON({
					type: 'user.login',
					username: username
				});
			}
		},
		"click #logout": function () {
			if (app.socket.hasOpenState()) {
				app.socket.sendJSON({
					type: 'user.logout'
				});
			}
		},
		"click #send": function () {
			var rexp = app.msgTemplates.pm;
			var msg = app.elements.msg;
			if (msg.value.length > 0 && app.socket.hasOpenState()) {
				var privParse = msg.value.match(rexp);
				var isPrivMsg = !!privParse;
				var body = {
					type: "user.msg." + (isPrivMsg ? 'private' : 'public'),
					text: isPrivMsg ? privParse[2] : msg.value
				};
				if (isPrivMsg) {
					body.receiver = privParse[1];
				}
				app.socket.sendJSON(body);
				msg.value = "";
			}
		},
		"click #get_users": function () {
			app.requestUserList();
		},
		"click #clear": function () {
			app.logClear();
		}
	};

	this.socket = new Socket(this.options);

	this.attachSocketListeners();
	this.attachDOMListeners();

	return this;
};
ChatApp.prototype.log = function (obj) {
	this.elements.loggerEl.innerHTML += new Date().toLocaleString() + ': ' + obj + '\n';
};
ChatApp.prototype.logClear = function () {
	this.elements.loggerEl.innerHTML = "";
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
ChatApp.prototype.attachDOMListeners = function () {
	var app = this,
		eventType = '',
		el = null,
		listenerFn =  null,
		parts;
	for (var i in app.domListeners) {
		if (app.domListeners.hasOwnProperty(i)) {
			parts = i.split(' ');
			eventType = parts[0];
			el = document.querySelector(parts[1]);
			listenerFn = app.domListeners[i];

			el.addEventListener(eventType, listenerFn);
		}
	}
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
ChatApp.prototype.requestUserList = function () {
	this.socket.sendJSON({
		type: "user.list"
	});
};
ChatApp.prototype.renderUserList = function () {
	var listEl = this.elements.userListEl;
	listEl.innerHTML = "";
	for (var i = 0; i < this.userList.length; i++) {
		var item = document.createElement('li');
		item.innerText = this.userList[i];
		listEl.appendChild(item);
	}
};
ChatApp.prototype.clearUserList = function () {
	var listEl = this.elements.userListEl;
	listEl.innerHTML = "";
	this.userList = [];
};
