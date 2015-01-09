var ClientSocket = (function (Socket) {
	var ClientSocket = function (options) {
		var reconnectTimer = null;
		var reconnectCount = 0;

		Socket.call(this, options);

		this.options = options || {};

		this.hasOpenState = function () {
			return this.readyState === 'open';
		};

		this.sendJSON = function (obj) {
			var stringified = JSON.stringify(obj);
			this.send(stringified);
		};

		this.reconnect = function () {
			var options = this.options;
			if (reconnectCount <= options.reconnectMaxTries || options.alwaysReconnect) {
				this.startTimer()
			}
		};

		this.resetCounter = function () {
			reconnectCount = 0;
		};

		this.startTimer = function () {
			var options = this.options;
			var self = this;
			reconnectTimer = setTimeout(function () {
				self.open();
				reconnectCount++;
			}, options.reconnectTimeout);
		};

		this.stopTimer = function () {
			window.clearTimeout(reconnectTimer);
		};

		this.on('open', this.resetCounter);
		this.on('close', this.reconnect);

		return this;
	};
	ClientSocket.prototype = Object.create(Socket.prototype);

	return ClientSocket;
})(eio.Socket);