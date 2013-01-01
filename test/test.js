var express = require('express'),
    http = require('http'),
    request = require('request');

var opts,
    app,
    currentError,
    server;

opts = {
    root: __dirname + '/fixtures',
    port: 8888,
    error: function(err, req, res, next) {
        currentError = err;
    }
};

app = express();
app.set('view engine', 'html');
app.engine('html', require('jqtpl').__express);
server = app.listen(opts.port);
setup(app, opts);
app.use(function(err, req, res, next) {
    currentError = err;
    res.send(err.code);
});


QUnit.done(function() {
    server.close();
});

function req(path, callback) {
    request.get('http://localhost:' + opts.port + path, function(err, res, body) {
        callback(body, res);
    });
}

test('call wrong controller', 4, function() {
    stop();
    currentError = null;
    req('/mymodule/wroncontroller/myaction', function(data, res) {
        notEqual(currentError, null, 'error is there');
        equal(currentError.message, 'Controller not found.', 'correct error message')
        equal(currentError.type, 'NOT_FOUND', 'not found');
        equal(res.statusCode, 404, 'got 404');
        start();
    });
});

test('call wrong action', 4, function() {
    stop();
    currentError = null;
    req('/mymodule/mycontroller/wrongaction', function(data, res) {
        notEqual(currentError, null, 'error is there');
        equal(currentError.message, 'Action not found.', 'correct error message')
        equal(currentError.type, 'NOT_FOUND', 'not found');
        equal(res.statusCode, 404, 'got 404');
        start();
    });
});

test('call broken action', 2, function() {
    stop();
    currentError = null;
    req('/mymodule/mycontroller/brokenaction', function(data, res) {
        notEqual(currentError, null, 'error is there');
        equal(currentError.message, 'I am broken', 'correct error message')
        start();
    });
});

test('action call', 1, function() {
    stop();
    req('/mymodule/mycontroller/myaction', function(data) {
        equal(data, 'test passed', 'action call works');
        start()
    });
});

test('default view', 1, function() {
    stop();
    req('/mymodule/mycontroller/getview', function(data) {
        equal(data, 'hello world', 'default view rendered');
        start();
    });
});
