var express = require('express'),
    http = require('http');

var o = {
        root: __dirname + '/fixtures',
        port: 8888    
    },
    app;


function request(path, callback) {
    var client = http.createClient(o.port);
    var request = client.request('GET', path, {'host': 'http://localhost'});
    request.end();
    request.on('response', function (response) {
        response.setEncoding('utf8');
	    response.on('data', callback);
    });    
}

QUnit.module('mvc', {
    setup: function() {
        app = express.createServer();
        app.set('view engine', 'html');
        app.register('.html', require('jqtpl'));        
        setup(app, o);
        app.listen(o.port);
    },
    teardown: function() {
         app.close();       
    }
});

test('action call', 1, function() {
    stop();

    request('/mymodule/mycontroller/myaction', function(data) {
        equal(data, 'test passed', 'action call works');
        start();
    });
});

test('default view', 1, function() {
    stop();
    request('/mymodule/mycontroller/getview', function(data) {
        equal(data, 'hello world', 'default view rendered');
        start();
    });
});

