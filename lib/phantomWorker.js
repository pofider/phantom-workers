var childProcess = require('child_process'),
    phantomjs = require("phantomjs"),
    cluster = require("cluster"),
    http = require('http'),
    netCluster = require("net-cluster"),
    checkPortStatus = require("./checkPortStatus.js"),
    portScanner = require('portscanner');


var findFreePort = function (host, cb) {
    var server = netCluster.createServer();
    var port = 0;
    server.on('listening', function () {
        port = server.address().port;
        server.close();
    });
    server.on('close', function () {
        cb(null, port);
    });
    server.listen(0, host);
};

var findFreePortInRange = function (host, portLeftBoundary, portRightBoundary, cb) {

    //in cluster we don't want ports to collide, so we make a special space for every worker assuming max number of cluster workers is 5
    if (cluster.worker) {
        portLeftBoundary = portLeftBoundary + (((portRightBoundary - portLeftBoundary) / 5) * (cluster.worker.id - 1));
    }

    portScanner.findAPortNotInUse(portLeftBoundary, portRightBoundary, host, function(error, port) {
        cb(error, port);
    })
};


var PhantomWorker = module.exports = function (options) {
    this.options = options;
    this.isBusy = false;

    if (options.portLeftBoundary && options.portRightBoundary) {
        this.findFreePort = function (cb) {
            findFreePortInRange(options.host, options.portLeftBoundary, options.portRightBoundary, cb);
        };
    }
    else {
        this.findFreePort = function (cb) {
            findFreePort(options.host, cb);
        };
    }
};

PhantomWorker.prototype.start = function (cb) {
    var self = this;

    this.findFreePort(function (err, port) {
        if (err)
            return cb(err);

        self.port = port;

        var childArgs = [
            '--ignore-ssl-errors=yes',
            '--web-security=false',
            '--ssl-protocol=any',
            self.options.pathToPhantomScript
        ];

        var childOpts = {
            env: {}
        };

        childOpts.env[self.options.hostEnvVarName] = self.options.host;
        childOpts.env[self.options.portEnvVarName] = port;

        //we send host and port as env vars to child process
        self._childProcess = childProcess.execFile(phantomjs.path, childArgs, childOpts, function (error, stdout, stderr) {

        });

        self.checkAlive(cb);

        process.stdout.setMaxListeners(0);
        process.stderr.setMaxListeners(0);

        self._childProcess.stdout.pipe(process.stdout);
        self._childProcess.stderr.pipe(process.stderr);
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
        }, 100);
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
