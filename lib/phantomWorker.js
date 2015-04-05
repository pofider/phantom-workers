var childProcess = require('child_process'),
    phantomjs = require("phantomjs"),
    http = require('http'),
    netCluster = require("net-cluster"),
    checkPortStatus = require("./checkPortStatus.js");

var findFreePort = function (cb) {
    var server = netCluster.createServer();
    var port = 0;
    server.on('listening', function () {
        port = server.address().port;
        server.close();
    });
    server.on('close', function () {
        cb(null, port);
    });
    server.listen(0);
};


var PhantomWorker = module.exports = function (options) {
    this.options = options;
    this.isBusy = false;
};

PhantomWorker.prototype.start = function (cb) {
    var self = this;
    findFreePort(function (err, port) {
        self.port = port;

        var childArgs = [
            '--ignore-ssl-errors=yes',
            '--web-security=false',
            '--ssl-protocol=any',
            self.options.pathToPhantomScript
        ];

        self._childProcess = childProcess.execFile(phantomjs.path, childArgs, function (error, stdout, stderr) {

        });

        self.checkAlive(cb);

        process.stdout.setMaxListeners(0);
        process.stderr.setMaxListeners(0);
        process.stdin.setMaxListeners(0);

        self._childProcess.stdout.pipe(process.stdout);
        self._childProcess.stderr.pipe(process.stderr);
        self._childProcess.stdin.write(port + "\n");
    });
};

PhantomWorker.prototype.checkAlive = function (cb, shot) {
    var self = this;
    shot = shot || 1;
    checkPortStatus(this.port, function (err, status) {
        if (!err && status === 'open') {
            return cb();
        }

        if (shot > 50) {
            return cb(new Error("Unable to reach phantomjs web server."));
        }

        shot++;
        setTimeout(function() {
            self.checkAlive(cb, shot);
        }, 50);
    });
};

PhantomWorker.prototype.recycle = function (cb) {
    var self = this;
    self._childProcess.kill();
    self.start(cb);
};

PhantomWorker.prototype.kill = function () {
    if (this._childProcess)
        this._childProcess.kill("SIGTERM");
};

PhantomWorker.prototype.execute = function (options, cb) {
    var self = this;
    this.isBusy = true;

    var http_opts = {
        hostname: '127.0.0.1',
        port: this.port,
        path: '/',
        method: 'POST'
    };

    var req = http.request(http_opts, function (res) {
        var result = "";
        res.on("data", function (chunk) {
            result += chunk;
        });
        res.on("end", function () {
            self.isBusy = false;
            cb(null, result ? JSON.parse(result) : null);
        });
    });

    req.setHeader('Content-Type', 'application/json');
    var json = JSON.stringify(options);
    req.setHeader('Content-Length', Buffer.byteLength(json));
    req.write(json);

    req.on("error", function (e) {
        self.isBusy = false;
        cb(e);
    });

    req.end();
};
