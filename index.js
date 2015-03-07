
module.exports = function(options) {
    return new (require("./lib/phantomManager.js"))(options);
}

module.exports.PhantomManager = require("./lib/phantomManager.js");
module.exports.PhantomWorker = require("./lib/phantomWorker.js");

