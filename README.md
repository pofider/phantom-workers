#phantom-workers
[![NPM Version](http://img.shields.io/npm/v/phantom-workers.svg?style=flat-square)](https://npmjs.com/package/phantom-workers)
[![License](http://img.shields.io/npm/l/phantom-workers.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/pofider/phantom-workers.png?branch=master)](https://travis-ci.org/pofider/phantom-workers)

> **Run phantom scripts in multiple  managed reusable workers**

Running a script in phantom can soon become performance bottleneck when it comes to scale. Starting phantomjs process is not a cheap operation and you cannot start hundred of them at once. This package provides solution using phantomjs webserver and multiple phantomjs processes running in parallel.


##First create a phantomjs script wrapped in webserver

```js
//every worker gets unique port, get it from a process environment variables
var system = require("system");
var port = system.env['PHANTOM_WORKER_PORT'];
var host = system.env['PHANTOM_WORKER_HOST'];

require('webserver').create().listen(host + ':' + port, function (req, res) {
	//standard phantomjs script which get input parametrs from request
	var page = require('webpage').create();
	page.open(JSON.parse(req.post).url, function(status) {
    var title = page.evaluate(function() {
	    return document.title;
	});

	//write the result to the response
	res.statusCode = 200;
    res.write({ title: title });
    res.close();
});

```

##Start phantomjs workers
```js
var phantom = require("phantom-workers")({
	pathToPhantomScript: "script.js",
	timeout: 5000,
	numberOfWorkers: 10
});

phantom.start(function() {
	phantom.execute({ url: "http://jsreport.net" }, function(err, res) {
		console.log(res.title);
	});
});
```

##Options

`pathToPhantomScript` (required) - absolute path to the phantom script<br/>
`timeout` - execution timeout in ms<br/>
`numberOfWorkers` - number of phantomjs instances<br/>
`host` - ip or hostname where to start listening phantomjs web service, default 127.0.0.1<br/>
`portLeftBoundary` - don't specify if you just want to take any random free port<br/>
`portRightBoundary` - don't specify if you just want to take any random free port<br/>
`hostEnvVarName` - customize the name of the environment variable passed to the phantom script that specifies the worker host. defaults to `PHANTOM_WORKER_HOST`<br/>
`portEnvVarName` - customize the name of the environment variable passed to the phantom script that specifies the worker port. defaults to `PHANTOM_WORKER_PORT`<br/>
`phantomPath` - path to the phantomjs library. If not specified, this will use the version of phantom declared in the `optionalDependencies` in `package.json`<br/>
`proxy,proxy-type,proxy-auth` - see phantomjs arguments for proxy setting details    
`workerEnv` - object with additional environment variables passed to the phantom process

##phantomjs2
This package includes phantomjs 1.9.x distribution. If you like to rather use latest phantomjs you can provide it in the phantomPath option.

Install phantomjs-prebuilt and then...
```js
var phantom = require("phantom-workers")({
	pathToPhantomScript: "script.js",
    phantomPath: require("phantomjs-prebuilt").path
});
```

##License
See [license](https://github.com/pofider/phantom-workers/blob/master/LICENSE)
