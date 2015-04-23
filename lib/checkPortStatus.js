var net = require('net')
    , Socket = net.Socket;


module.exports = function (port, host, cb) {
    var host = host;
    var timeout = 50;
    var connectionRefused = false;

    var socket = new Socket()
        , status = null
        , error = null;

    // Socket connection established, port is open
    socket.on('connect', function () {
        status = 'open';
        socket.destroy()
    });

    // If no response, assume port is not listening
    socket.setTimeout(timeout);
    socket.on('timeout', function () {
        status = 'closed';
        error = new Error('Timeout (' + timeout + 'ms) occurred waiting for ' + host + ':' + port + ' to be available')
        socket.destroy();
    });

    // Assuming the port is not open if an error. May need to refine based on
    // exception
    socket.on('error', function (exception) {
        if (exception.code !== "ECONNREFUSED") {
            error = exception
        }
        else
            connectionRefused = true;
        status = 'closed'
    });

    // Return after the socket has closed
    socket.on('close', function (exception) {
        if (exception && !connectionRefused)
            error = exception;
        else
            error = null;
        cb(error, status)
    });

    socket.connect(port, host)
};
