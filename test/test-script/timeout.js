var hostAndPort = require("system").stdin.readLine();

require('webserver').create().listen(hostAndPort, function (req, res) {

});
