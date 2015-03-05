var port = require("system").stdin.readLine();

require('webserver').create().listen('127.0.0.1:' + port, function (req, res) {

});
