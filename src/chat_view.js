var ChatView = function (app) {
	this.app = app;
	this.el = document.getElementById('app_view');
	this.elements = {
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
	this.domListeners = {
		"click #connect": 'onConnectClick',
		"click #disconnect": 'onDisconnectClick',
		"click #login": 'onLoginClick',
		"click #logout": 'onLogoutClick',
		"click #send": 'onSendClick',
		"click #get_users": 'onUpdateListClick',
		"click #clear": 'onClearClick'
	};

	this.attachListeners();
};
ChatView.prototype.attachListeners = function () {
	var view = this,
		eventType = '',
		el = null,
		listenerFn =  null,
		parts;
	for (var i in view.domListeners) {
		if (view.domListeners.hasOwnProperty(i)) {
			parts = i.split(' ');
			eventType = parts[0];
			el = document.querySelector(parts[1]);
			listenerFn = view[view.domListeners[i]];
			if (typeof listenerFn === 'function') {
				el.addEventListener(eventType, listenerFn.bind(view));
			}
		}
	}
};
ChatView.prototype.renderUserList = function () {
	var list = this.app.userList;
	var listEl = this.elements.userListEl;
	listEl.innerHTML = "";
	for (var i = 0; i < list.length; i++) {
		var item = document.createElement('li');
		item.innerText = list[i];
		listEl.appendChild(item);
	}
};
ChatView.prototype.clearUserList = function () {
	var listEl = this.elements.userListEl;
	listEl.innerHTML = "";
};
ChatView.prototype.log = function (obj) {
	this.elements.loggerEl.innerHTML += new Date().toLocaleString() + ': ' + obj + '\n';
};
ChatView.prototype.logClear = function () {
	this.elements.loggerEl.innerHTML = "";
};
ChatView.prototype.onConnectClick = function () {
	this.app.connect();
};
ChatView.prototype.onDisconnectClick = function () {
	this.app.disconnect();
};
ChatView.prototype.onLoginClick = function () {
	var username = window.prompt('Enter your username');
	this.app.requestLogin(username);
};
ChatView.prototype.onLogoutClick = function () {
	this.app.requestLogout();
};
ChatView.prototype.onSendClick = function () {
	var msg = this.elements.msg.value;
	this.app.sendChatMsg(msg);
	this.elements.msg.value = '';
};
ChatView.prototype.onUpdateListClick = function () {
	this.app.requestUserList();
};
ChatView.prototype.onClearClick = function () {
	this.logClear()
};