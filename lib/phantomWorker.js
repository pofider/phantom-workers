var q = require("q"),
    childProcess = require('child_process'),
    phantomjs = require("phantomjs"),
    path = require("path"),
    http = require('http'),
    netCluster = require("net-cluster");

var findFreePort = function () {
    return q.nfcall(function (cb) {
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
    });
};

var PhantomWorker = module.exports = function (options) {
    this.options = options;
    this.isBusy = false;
};

PhantomWorker.prototype.start = function () {
    var self = this;
    return findFreePort().then(function (port) {
        self.port = port;

        var childArgs = [
            '--ignore-ssl-errors=yes',
            '--web-security=false',
            '--ssl-protocol=any',
            self.options.pathToPhantomScript
        ];

        var defer = q.defer();

        self._childProcess = childProcess.execFile(phantomjs.path, childArgs, function (error, stdout, stderr) {
        });

        //we need to wait a little bit until phantomjs server is started
        setTimeout(function() {
            defer.resolve();
        }, 100);

        self._childProcess.stdout.pipe(process.stdout);
        self._childProcess.stderr.pipe(process.stderr);
        self._childProcess.stdin.write(port + "\n");

        return defer.promise;
    });
};

PhantomWorker.prototype.recycle = function () {
    var self = this;
    self._childProcess.kill();
    return self.start();
};

PhantomWorker.prototype.kill = function () {
    this._childProcess.kill("SIGTERM");
};

PhantomWorker.prototype.execute = function (options) {
    var self = this;
    this.isBusy = true;
    var deferred = q.defer();

    var http_opts = {
        hostname: '127.0.0.1',
        port: this.port,
        path: '/',
        method: 'POST'
    };

    var req = http.request(http_opts, function (res) {
        var result = "";
        res.on("data", function(chunk) {
            result += chunk;
        });
        res.on("end", function() {
            self.isBusy = false;
            deferred.resolve(JSON.parse(result));
        });
    });

    req.setHeader('Content-Type', 'application/json');
    var json = JSON.stringify(options);
    req.setHeader('Content-Length', Buffer.byteLength(json));
    req.write(json);

    req.on("error", function (e) {
        self.isBusy = false;
    });

    req.end();

    return deferred.promise;
};
