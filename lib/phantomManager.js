/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * PhantomManager is responsible of managing pool of phantomjs worker processes
 * and distributing pdf rendering tasks to them.
 */

var q = require("q"),
    events = require("events"),
    util = require("util"),
    net = require("net"),
    request = require('request'),
    _ = require("underscore"),
    numCPUs = require('os').cpus().length,
    path = require("path"),
    PhantomWorker = require("./phantomWorker.js");

var PhantomManager = module.exports = function (options) {
    this._phantomInstances = [];
    this.options = options || {};
    this.options.numberOfWorkers = this.options.numberOfWorkers || numCPUs;
    this.options.timeout = options.timeout || 180000;
    this.tasksQueue = [];
};

util.inherits(PhantomManager, events.EventEmitter);

PhantomManager.prototype.start = function () {
    var self = this;
    var startPromises = [];
    for (var i = 0; i < self.options.numberOfWorkers; i++) {
        self._phantomInstances.push(new PhantomWorker({
            pathToPhantomScript: self.options.pathToPhantomScript
        }));
        startPromises.push(self._phantomInstances[i].start());
    };

    process.once("exit", function () {
        self.kill();
    });

    return q.all(startPromises);
};

PhantomManager.prototype.kill = function() {
    this._phantomInstances.forEach(function (i) {
        i.kill();
    });
}

PhantomManager.prototype.execute = function (options) {
    var self = this;

    var freePhantomInstance = _.findWhere(this._phantomInstances, {
        isBusy: false
    });

    if (freePhantomInstance) {
        return this._executeInWorker(freePhantomInstance, options);
    }

    var deferred = q.defer();
    this.tasksQueue.push({options: options, deferred: deferred});
    return deferred.promise;
};

PhantomManager.prototype._executeInWorker = function (worker, options) {
    var self = this;
    var isDone = false;

    var deferred = q.defer();

    setTimeout(function () {
        if (isDone)
            return;

        isDone = true;

        self.emit("timeout", worker);

        worker.recycle().then(function () {
            var error = new Error();
            error.weak = true;
            error.message = "Timeout";
            deferred.reject(error);

            self.tryFlushQueue();
        });
    }, this.options.timeout);

    worker.execute(options).then(function (result) {
        isDone = true;
        self.tryFlushQueue();
        deferred.resolve(result);
    });

    return deferred.promise;
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

    this._executeInWorker(freePhantomInstance, task.options).then(function (numberOfPages) {
        task.deferred.resolve(numberOfPages);
    });
};




