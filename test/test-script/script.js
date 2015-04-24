var hostAndPort = require("system").stdin.readLine();

require('webserver').create().listen(hostAndPort, function (req, res) {
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
