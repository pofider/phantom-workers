/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * PhantomManager is responsible of managing pool of phantomjs worker processes
 * and distributing pdf rendering tasks to them.
 */

var events = require("events"),
    util = require("util"),
    _ = require("underscore"),
    numCPUs = require('os').cpus().length,
    cluster = require("cluster"),
    PhantomWorker = require("./phantomWorker.js");

var PhantomManager = module.exports = function (options) {
    this._phantomInstances = [];
    this.options = options || {};
    this.options.workerEnv = this.options.workerEnv || {};
    this.options.numberOfWorkers = this.options.numberOfWorkers || numCPUs;
    this.options.timeout = this.options.timeout || 180000;
    this.options.host = this.options.host || "127.0.0.1";
    this.options.hostEnvVarName = this.options.hostEnvVarName || "PHANTOM_WORKER_HOST"
    this.options.portEnvVarName = this.options.portEnvVarName || "PHANTOM_WORKER_PORT";
    this._timeouts = [];
    this.tasksQueue = [];
};

util.inherits(PhantomManager, events.EventEmitter);

PhantomManager.prototype.start = function (cb) {
    var self = this;

    process.once("exit", function () {
        self.kill();
    });

    var started = 0;
    var workerErrors = [];
    var couldNotStartWorkersErr;

    for (var i = 0; i < self.options.numberOfWorkers; i++) {
        self._phantomInstances.push(new PhantomWorker({
            pathToPhantomScript: self.options.pathToPhantomScript,
            hostEnvVarName: self.options.hostEnvVarName,
            portEnvVarName: self.options.portEnvVarName,
            host: self.options.host,
            portLeftBoundary: self.options.portLeftBoundary,
            portRightBoundary: self.options.portRightBoundary,
            phantomPath: self.options.phantomPath,
            env: self.options.workerEnv
        }));
        self._phantomInstances[i].start(function(err) {
            if (err) {
                workerErrors.push(err);
            }

            started++;

            if (started === self.options.numberOfWorkers) {
                if (workerErrors.length) {
                    couldNotStartWorkersErr = new Error("phantom manager could not start all workers..");
                    couldNotStartWorkersErr.workerErrors = workerErrors;
                    return cb(couldNotStartWorkersErr);
                }

                cb(null);
            }
        });
    }
};

PhantomManager.prototype.kill = function() {
    this._timeouts.forEach(function(t) {
        clearTimeout(t);
    });
    this._phantomInstances.forEach(function (i) {
        i.kill();
    });
};

PhantomManager.prototype.execute = function (options, cb) {
    var self = this;

    var freePhantomInstance = _.findWhere(this._phantomInstances, {
        isBusy: false
    });

    if (freePhantomInstance) {
        this._executeInWorker(freePhantomInstance, options, cb);
        return;
    }

    this.tasksQueue.push({options: options, cb: cb});
};

PhantomManager.prototype._executeInWorker = function (worker, options, cb) {
    var self = this;
    var isDone = false;
    var callbackWasCalled = false;

    var timeout = setTimeout(function () {
        self._timeouts.splice(self._timeouts.indexOf(timeout), 1);
        if (isDone)
            return;

        isDone = true;

        self.emit("timeout", worker);

        worker.recycle(function () {
            if (!callbackWasCalled) {
                var error = new Error();
                error.weak = true;
                error.message = "Timeout";
                cb(error);
            }

            self.tryFlushQueue();
        });
    }, this.options.timeout);

    this._timeouts.push(timeout);

    worker.execute(options, function (err, result) {
        if (isDone)
            return;

        if (err) {
            callbackWasCalled = true;
            return cb(err);
        }

        callbackWasCalled = true;
        isDone = true;
        self.tryFlushQueue();
        cb(null, result);
    });
};

PhantomManager.prototype.tryFlushQueue = function () {
    if (this.tasksQueue.length === 0)
        return;

    var freePhantomInstance = _.findWhere(this._phantomInstances, {
        isBusy: false
    });

    if (!freePhantomInstance)
        return;

    var task = this.tasksQueue.shift();

    this._executeInWorker(freePhantomInstance, task.options, task.cb);
};




