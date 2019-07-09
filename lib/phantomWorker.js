var childProcess = require('child_process'),
    cluster = require('cluster'),
    http = require('http'),
    checkPortStatus = require('./checkPortStatus'),
    getRandomPort = require('./getRandomPort'),
    objectAssign = require('object-assign');

var findFreePort = function (host, cb) {
    getRandomPort({
        host: host
    }, cb);
};

var findFreePortInRange = function (host, portLeftBoundary, portRightBoundary, cb) {
    getRandomPort({
        min: portLeftBoundary,
        max: portRightBoundary,
        host: host
    }, cb);
};


var PhantomWorker = module.exports = function (options) {
    this.options = options;
    this.isBusy = false;

    if (!this.options.phantomPath) {
        this.options.phantomPath = require('phantomjs').path;
    }

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
    var startError;

    this.findFreePort(function (err, port) {
        if (err)
            return cb(err);

        self.port = port;

        var childArgs = [
            '--ignore-ssl-errors=yes',
            '--web-security=false',
            '--ssl-protocol=any'
        ];

        if (self.options.proxy) {
            childArgs.push('--proxy=' + self.options.proxy);
        }

        if (self.options['proxy-type']) {
            childArgs.push('--proxy-type=' + self.options['proxy-type']);
        }

        if (self.options['proxy-auth']) {
            childArgs.push('--proxy-auth=' + self.options['proxy-auth']);
        }

        childArgs.push(self.options.pathToPhantomScript);

        var childOpts = {
            windowsHide: true,
            env: objectAssign({}, process.env, self.options.env)
        };

        childOpts.env[self.options.hostEnvVarName] = self.options.host;
        childOpts.env[self.options.portEnvVarName] = port;

        //we send host and port as env vars to child process
        self._childProcess = childProcess.execFile(self.options.phantomPath, childArgs, childOpts, function (error, stdout, stderr) {
          var segFaultMsg;

            if (error) {
                if (error.signal === 'SIGSEGV') {
                    segFaultMsg = (
                        'Segmentation fault error: if you are using macOS Sierra with phantomjs < 2 remember that ' +
                        'phantomjs < 2 does not work there and has bugs (https://github.com/ariya/phantomjs/issues/14558), ' +
                        'try to upgrade to phantom 2 if using macOS Sierra'
                    );

                    error.message = error.message + ', ' + segFaultMsg;
                    error.mainReason = segFaultMsg;
                }

                startError = error
            }
        });

        self.checkAlive(function (checkErr) {
            if (startError) {
                return cb(startError);
            } else if (checkErr) {
                return cb(checkErr);
            }

            cb();
        });

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
            try {
                var parsedResult = result ? JSON.parse(result) : null
                cb(null, parsedResult)
            } catch (e) {
                cb(new Error('Unparsable response from the phantomjs ' + result))
            }
        });
    });

    req.setHeader('Content-Type', 'application/json');
    var json = JSON.stringify(options);
    req.setHeader('Content-Length', Buffer.byteLength(json));
    req.write(json);

    req.on("error", function (e) {
        // recycle phantomjs if it cannot accept connections to avoid getting it freezed in the invalid state
        if (e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET') {
            return self.recycle(function (recycleError) {
                self.isBusy = false;
                cb(recycleError || e);
            });
        }

        self.isBusy = false;
        cb(e);
    });

    req.end();
};
