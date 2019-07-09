var net = require('net');

var DEFAULT_MIN = 1025;
var DEFAULT_MAX = 65535;
var DEFAULT_MAX_ATTEMPTS = 50;

function getRandomPort (opts, cb) {
	var min = DEFAULT_MIN;
	var max = DEFAULT_MAX;
	var maxAttempts = DEFAULT_MAX_ATTEMPTS;
	var options = opts || {};
	var host;
	var port;
	var server;

	if (options.min != null) {
		min = options.min;
	}

	if (options.max != null) {
		max = options.max;
	}

	if (options.maxAttempts != null) {
		maxAttempts = options.maxAttempts;
	}

	if (options.host != null) {
		host = options.host;
	}

	port = getRandomNumber(min, max);

	server = net.createServer();

	server.listen(port, host, function () {
    server.once('close', function () { cb(null, port) });
    server.close();
  });

	server.on('error', function () {
    if (--maxAttempts) {
      return getRandomPort({
				min: min,
				max: max,
				maxAttempts: maxAttempts
			}, cb);
    }

    cb(new Error('Could not find an available port'));
  });
}

function getRandomNumber (minimum, maximum) {
  if (maximum === undefined) {
	  maximum = minimum;
		minimum = 0;
	}

	if (typeof minimum !== 'number' || typeof maximum !== 'number') {
		throw new TypeError('Expected all arguments to be numbers');
	}

	return Math.floor(
		(Math.random() * (maximum - minimum + 1)) + minimum
	);
}

module.exports = getRandomPort;
