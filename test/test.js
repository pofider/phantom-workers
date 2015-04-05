var should = require("should"),
    PhantomManager = require("../lib/phantomManager.js"),
    path = require("path");

describe("phantom workers", function () {

    var phantomManager;

    it("should be able to communicate with slowly starting phantom", function (done) {
        this.timeout(4000);
        phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "slowstart.js"),
            numberOfWorkers: 1
        });
        phantomManager.start(function(err) {
            if (err)
                return done(err);

            phantomManager.execute({foo: "test"}, function (err, res) {
                if (err)
                    return done(err);

                done();
            });
        });
    });

    it("should be able to communicate with phantom", function (done) {
        phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "script.js"),
            numberOfWorkers: 1
        });
        phantomManager.start(function(err) {
            if (err)
                return done(err);

            phantomManager.execute({foo: "test"}, function (err, res) {
                if (err)
                    return done(err);

                res.should.have.property("foo");
                res.foo.should.be.eql("test");
                done();
            });
        });
    });

    it("should be able to send just a simple string on input", function (done) {
        phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "script.js"),
            numberOfWorkers: 1
        });
        phantomManager.start(function(err) {
            if (err)
                return done(err);

            phantomManager.execute("test", function (err, res) {
                if (err)
                    return done(err);

                res.should.be.eql("test");
                done();
            });
        });
    });

    it("should spin up specified number of workers", function (done) {
        phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "script.js"),
            numberOfWorkers: 5
        });
        phantomManager.start(function (err) {
            if (err)
                return done(err);

            phantomManager._phantomInstances.should.have.length(5);
            done();
        });
    });

    it("timeout should emit event", function (done) {
        phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "timeout.js"),
            numberOfWorkers: 1,
            timeout: 10
        });
        var emited = false;
        phantomManager.on("timeout", function (workerInstance) {
            emited = true;
            done();
        });
        phantomManager.start(function (err) {
            if (err)
                return done(err);

            phantomManager.execute({}, function(err) {
                if (!err)
                    return done(new Error("Should not execute successfully"));
            });
        });

        setTimeout(function () {
            if (!emited)
                done(new Error("worker was not recycled"));
        }, 1500);
    });

    it("timeout should cb error", function (done) {
        phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "timeout.js"),
            numberOfWorkers: 1,
            timeout: 10
        });

        phantomManager.start(function (err) {
            if (err)
                return done(err);

            return phantomManager.execute({}, function (err, res) {
                if (!err)
                    return done(new Error("timeout should fail promise"));
                done();
            });
        });
    });
});