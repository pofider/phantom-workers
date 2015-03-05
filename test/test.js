var should = require("should"),
    PhantomManager = require("../lib/phantomManager.js"),
    path = require("path");

describe("phantom workers", function () {

    it("should be able to communicate with phantom", function (done) {
        var phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "script.js"),
            numberOfWorkers: 1
        });
        phantomManager.start().then(function () {
            return phantomManager.execute({foo: "test"}).then(function (res) {
                res.should.have.property("foo");
                res.foo.should.be.eql("test");
                done();
            })
        }).catch(done);
    });

    it("should spin up specified number of workers", function (done) {
        var phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "script.js"),
            numberOfWorkers: 5
        });
        phantomManager.start().then(function () {
            phantomManager._phantomInstances.should.have.length(5);
            done();
        }).catch(done);
    });

    it("timeout should emit event", function (done) {
        var phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "timeout.js"),
            numberOfWorkers: 1,
            timeout: 10
        });
        phantomManager.on("timeout", function (workerInstance) {
            done();
        });
        phantomManager.start().then(function () {
            return phantomManager.execute({});
        }).catch(done);
        setTimeout(function () {
            done(new Error("worker was not recycled"));
        }, 500);
    });

    it("timeout should fail promise", function (done) {
        var phantomManager = new PhantomManager({
            pathToPhantomScript: path.join(__dirname, "test-script", "timeout.js"),
            numberOfWorkers: 1,
            timeout: 10
        });

        phantomManager.start().then(function () {
            return phantomManager.execute({}).then(function () {
                done(new Error("timeout should fail promise"));
            }).catch(function () {
                done();
            })
        }).catch(done);
    });
});