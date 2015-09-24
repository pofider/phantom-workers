var port = require("system").env['PHANTOM_WORKER_PORT'];
var host = require("system").env['PHANTOM_WORKER_HOST'];

require('webserver').create().listen(host + ':' + port, function (req, res) {

});
