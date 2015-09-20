var port = require("system").env['PHANTOM_WORKER_PORT'];

require('webserver').create().listen('127.0.0.1:' + port, function (req, res) {
    try {
        res.statusCode = 200;
        res.write(req.post);
        res.close();
    } catch (e) {
        res.statusCode = 500;
        res.write(JSON.stringify(e));
        res.close();
    }
});
