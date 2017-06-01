var port = require("system").env['PHANTOM_WORKER_PORT'];
var host = require("system").env['PHANTOM_WORKER_HOST'];

var ws = require('webserver').create()

var numberOfRequests = 1

function handler (req, res) {
    res.statusCode = 200;
    res.write(numberOfRequests++);
    res.close();    
    // always stop listening after the request to replicate ECONNREFUSED errors
    setTimeout(function () {
        ws.close();
    })    
}

ws.listen(host + ':' + port, handler);
