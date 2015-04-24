var port = require("system").stdin.readLine();
var host = require("system").stdin.readLine();

require('webserver').create().listen(host + ':' + port, function (req, res) {

});
