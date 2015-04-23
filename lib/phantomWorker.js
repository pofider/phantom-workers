var childProcess = require('child_process'),
    phantomjs = require("phantomjs"),
    http = require('http'),
    checkPortStatus = require("./checkPortStatus.js"),
    portScanner = require('portscanner');


var findFreePort = function (host, portLeftBoundary, portRightBoundary, cb) {
    portScanner.findAPortNotInUse(portLeftBoundary, portRightBoundary, host, function(error, port) {
        cb(error, port);
    })
};


var PhantomWorker = module.exports = function (options) {
    this.options = options;

    this.isBusy = false;
};

PhantomWorker.prototype.start = function (cb) {
    var self = this;
    findFreePort(this.options.host, this.options.portLeftBoundary, this.options.portRightBoundary, function (err, port) {
        if (err)
            return cb(err);

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
        self._childProcess.stdin.write(self.options.host +':' + port + "\n");
    });
};

PhantomWorker.prototype.checkAlive = function (cb, shot) {
    var self = this;
    shot = shot || 1;
    checkPortStatus(this.port, this.options.host, function (err, status) {
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
        hostname: this.options.host,
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
