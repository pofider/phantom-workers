var port = require("system").env['PHANTOM_WORKER_PORT'];
var host = require("system").env['PHANTOM_WORKER_HOST'];
var env = require("system").env['PHANTOM_TEST_ENV'];

require('webserver').create().listen(host + ':' + port, function (req, res) {
  res.statusCode = 200;
  res.write(JSON.stringify({value: env}));
  res.close();
});
