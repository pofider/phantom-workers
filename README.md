#phantom-workers
[![NPM Version](http://img.shields.io/npm/v/phantom-workers.svg?style=flat-square)](https://npmjs.com/package/phantom-workers)
[![License](http://img.shields.io/npm/l/phantom-workers?style=flat-square)](http://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/pofider/phantom-workers.png?branch=master)](https://travis-ci.org/pofider/phantom-workers)

> **Run phantom scripts in multiple  managed reusable workers**

Running a script in phantom can soon become performance bottleneck when it comes to scale. Starting phantomjs process is not a cheap operation and you cannot start hundred of them at once. This package provides solution using phantomjs webserver and multiple phantomjs processes running in parallel.


##First create a phantomjs script wrapped in webserver

```js
//every worker gets unique port, get it from a readline
var port = require("system").stdin.readLine();

require('webserver').create().listen('127.0.0.1:' + port, function (req, res) {       
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
	phantom.excute({ url: "http://jsreport.net", function(err, res) {
		console.log(res.title);
	});
});
```

##License
See [license](https://github.com/pofider/phantom-workers/blob/master/LICENSE)