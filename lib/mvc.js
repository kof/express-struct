var $ = require('connect').utils,
    util = require('util'),
    http = require('http'),
    net = require('net'),
    querystring = require('querystring'),
    express = require('express'),
    io = require('socket.io');

/**
 * Default options.
 * @type {Object}
 * @export
 */
exports.options = {
    root: process.cwd(),
    route: '/:module/:controller?/:action?',
    socket: false,
    paramQuery: true
};


// Map from HTTP to CRUD.
var methodMap = {
        'POST': 'create',
        'PUT': 'update',
        'DELETE': 'delete',
        'GET': 'read'
    };

var res = http.ServerResponse.prototype,
    render = res.render;

/**
 * Override render method of express, because we want to make view
 * argument optional and we know the path to default view.
 *
 * @param {string|Object} view path to the view file is optional.
 * @param {Object|Function=} options or callback function.
 * @param {Function=} fn callback.
 * @param {string=} parent path to parent view.
 * @return {string|undefined} returns view string only if partial is rendered
 * @override
 */
res.render = function(view, options, fn, parent, sub) {
    var req = this.req,
        p = req.params,
        module = req.mvc.root + '/' + p.module;

    if (typeof view !== 'string') {
        parent = fn;
        fn = options;
        options = view;
        view = module + '/views/' + p.controller + '/' + p.action + '.' +
               req.app.settings['view engine'];
    } else {
        if (options.renderPartial) {
            view = module + '/views/' + p.controller + '/partials/' + view;
        } else {
            view = module + '/views/' + view;
        }
        
    }

    return render.call(this, view, options, fn, parent, sub);
};

/**
 * Setup MVC.
 * @param {Object} server instance.
 * @param {Object} options will extend defaults.
 * @export
 */
exports.setup = function(server, options) {
    var o = $.merge({}, exports.options);

    $.merge(o, options);

    function broadcast(data) {
        this.setHeader('sock-method', 'broadcast');
        return this.send(data);    
    }
    
    function sync(data) {
        this.setHeader('sock-method', 'sync');
        return this.send(data);    
    }

    function handler(req, res, next) {
        var p = req.params,
            module,
            controller,
            paramsQuery, i;

        // default controller name is module name
        p.controller = p.controller || p.module;

        controller = o.root + '/' + p.module + '/controllers/' + p.controller;

        // use cache directly to get more performance,
        // because require call is a bit costly
        module = require.cache[controller + '.js'];
        controller = module ? module.exports : require(controller);

        req.mvc = o;
        
        if (o.paramQuery && p[0] && p[0] !== '/') {
            // remove last and first slash
            paramsQuery = p[0].replace(/^\/|\/$/g, '').split('/');
            for (i = 0; i < paramsQuery.length; i += 2) {
                req.query[paramsQuery[i]] = paramsQuery[i+1];
            }
        }

        if (!p.action) {
            // default action name is controller name
            // if no CRUD property defined
            p.action = controller.CRUD ? methodMap[req.method] : p.controller;    
        }
        
        // add socket.io methods
        if (o.socket) {
            res.broadcast = broadcast;
            res.sync = sync;
        }
        
        console.log(
        req, res);

        return controller[p.action](req, res, next);
    }

    server.all(o.route, handler);
    
    if (o.socket) {
        mapSocket(server, o);    
    }
};

function mapSocket(server, o) {
    var socket = io.listen(server, o.socket);
    
    socket.on('connection', function(client) {
        client.sync = function(data) {
            client.send(data);
            client.broadcast(data);    
        };

        client.on('message', function(msg) {
            var options = {
                    host: o.host,
                    port: o.port,
                    path: msg.url,
                    method: msg.method,
                    headers: client.request.headers
                },
                req;
            
            options.headers['content-type'] = 'application/json';
            options.headers['socket-client-id'] = client.sessionId;
            
            req = http.request(options, function(res) {
                var responseText = '';

                res.setEncoding('utf-8');

                res.on('data', function(chunk) {
                    responseText += chunk;
                });
                
                res.on('end', function() {
                    var sockMethod = res.headers['sock-method'] || 'send',
                        data;
                    
                    // will throw exception if just a string
                    try {
                        responseText = JSON.parse(responseText);
                    } catch(e) {}
                        
                    data = {
                        url: msg.url,
                        method: msg.method,
                        status: res.statusCode,
                        responseText: responseText,
                        socketClientId: client.sessionId
                    };
                    
                    client[sockMethod](data);
                });
            });
	
            req.write(JSON.stringify(msg.body));
            req.end();
        });
        
        client.on('disconnect', function() {
        	// inform other users about disconnect of one user
            client.broadcast({
                status: 200,
                responseText: {
                    message: 'disconnect',
                    sessionId: client.sessionId
                }
            });
        });
        
        // inform users about coonect of one user
		client.broadcast({
			status: 200,
			responseText: {
				message: 'connect',
				sessionId: client.sessionId
			}
		});        
    });      
}
