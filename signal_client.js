(function () {
	var IP = '192.168.13.244';
	var PORT = 3000;
	var Socket = eio.Socket;

	var reconnectTimer = null;
	var reconnectCount = 0;
	var RECONNECT_MAX_TRIES = 10;
	var RECONNECT_TIMEOUT = 2000;
	var PERMANENT_RECONNECTION = false;

	var userList = [],
		socket = null;

	// elements
	var login = document.getElementById('login');
	var connect = document.getElementById('connect');
	var disconnect = document.getElementById('disconnect');
	var getUsers = document.getElementById('get_users');

	var msg = document.getElementById('msg');
	var send = document.getElementById('send');

	var userListEl = document.getElementById('user_list');
	var loggerEl = document.getElementById('logger');
	var clearLogBtn = document.getElementById('clear');

	Socket.prototype.sendJSON = function (obj) {
		var stringified = JSON.stringify(obj);
		this.send(stringified);
	};

	Socket.prototype.reconnect = function () {
		var self = this;
		if (reconnectCount <= RECONNECT_MAX_TRIES || PERMANENT_RECONNECTION) {
			reconnectTimer = setTimeout(function () {
				self.open();
				reconnectCount++;
			}, RECONNECT_TIMEOUT);
		}
	};

	socket = new Socket('ws://' + IP + ':' + PORT);

	socket.isOpened = false;
	window.SS = socket;

	socket.on('open', function () {
		reconnectCount = 0;
		socket.isOpened = true;
		log('connection opened');
	});

	socket.on('error', function () {
		log('connection error');
	});

	socket.on('close', function () {
		socket.isOpened = false;
		log('connection closed');
	});

	socket.on('close', socket.reconnect);
	socket.on('message', onMessage);

	var htmlListeners = {
		"click #connect": function () {
			if (!socket.isOpened) {
				console.log('connecting');
				socket.open();
			}
		},
		"click #disconnect": function () {
			if (socket.isOpened) {
				console.log('disconnecting');
				socket.close();
			}
			window.clearTimeout(reconnectTimer);
		},
		"click #login": function () {
			var username = window.prompt('Enter your username');
			socket.sendJSON({
				type: 'user.login',
				username: username
			});
		},
		"click #send": function () {
			if (msg.value.length > 0 && socket.isOpened) {
				socket.sendJSON({
					type: "user.msg.public",
					text: msg.value
				});
				msg.value = "";
			}
		},
		"click #clear": logClear
	};

	var messageHandlers = {
		"user.join": function () {

		},
		"user.left": function () {

		},
		"user.list": function (data) {
			log(data.usernames);
		},
		"user.login.success": function () {

		},
		"user.login.error": function () {

		},
		"user.logout.success": function () {

		},
		"user.logout.error": function () {

		},
		"user.msg.public": function (data) {
			log(data.text);
		},
		"user.msg.private": function (data) {

		}
	};

	function attachEvents() {
		var eventType = '',
			el = null,
			listenerFn =  null,
			parts;
		for (var i in htmlListeners) {
			if (htmlListeners.hasOwnProperty(i)) {
				parts = i.split(' ');
				eventType = parts[0];
				el = document.querySelector(parts[1]);
				listenerFn = htmlListeners[i];

				el.addEventListener(eventType, listenerFn);
			}
		}
	}

	function onMessage(data) {
		var parsed = null;

		try {
			parsed = JSON.parse(data);
			if (parsed && messageHandlers.hasOwnProperty(parsed.type)) {
				messageHandlers[parsed.type](parsed);
			} else {
				log("Unknown message type");
			}
		} catch (e) {
			log("Message parse error");
			throw e;
		}
	}

	function log(obj) {
		loggerEl.innerHTML += new Date().toLocaleString() + ': ' + obj + '\n';
	}

	function logClear() {
		loggerEl.innerHTML = "";
	}

	function renderUserList() {
		userListEl.innerHTML = "";
		for (var i = 0; i < userList.length; i++) {
			var item = document.createElement('li');
			item.innerText = userList[i];
			userListEl.appendChild(item);
		}
	}

	attachEvents();
})();
