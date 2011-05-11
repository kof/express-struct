var $ = require('connect').utils,
    util = require('util'),
    http = require('http'),
    querystring = require('querystring'),
    express = require('express'),
    socket = require('socket.io');

/**
 * Default options.
 * @type {Object}
 * @export
 */
exports.options = {
    controllerSuffix: '',
    routePrefix: '',
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
    var o = $.merge({}, exports.options),
        route, socketConnection,
        // default headers over socket
        headers = {'content-type': 'application/json'};

    $.merge(o, options);

    route = o.routePrefix + o.route;

    function handler(req, res, next) {
        var p = req.params,
            module,
            controller,
            paramsQuery, i;

        // default controller name is module name
        p.controller = p.controller || p.module;

        controller = o.root + '/' + p.module + '/controllers/' +
                     p.controller + o.controllerSuffix;

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

        return controller[p.action](req, res, next);
    }

    server.all(route, handler);
    
    if (o.socket) {
        socketConnection = socket.listen(server, o.socket);
        
        function Response(client, req) {
            this._client = client;
            this._req = req;
        }
        
        util.inherits(Response, http.ServerResponse);
        
        $.merge(Response.prototype, {
            send: function(data) {
                return this._client.send(this._wrapData(data));
            },

            broadcast: function(data) {
                return this._client.broadcast(this._wrapData(data));
            },
            
            sync: function(data) {
                this._client.send(this._wrapData(data));
                this._client.broadcast(this._wrapData(data));                        
            },

            _wrapData: function(r) {
                var data = {},
                    status, responseText = null;
                
                typeof r === 'number' ? status = r : responseText = r;
                
                data.status = status || this._status || 200;
                data.responseText = responseText;
                data.url = this._req.url;
                data.method = this._req.method;
                return data;
            }            
        });

        socketConnection.on('connection', function(client) {
	        client.on('message', function(msg) {
                var queryStr =  msg.url.substr(msg.url.indexOf('?') + 1),
                    req, res;

                req = {
                    method: msg.method || client.request.method,
                    headers: msg.headers || headers,
                    url: msg.url,
                    query: queryStr ? querystring.parse(queryStr) : {},
                    body: msg.body
                };
                
                // need to create a new response object, because
                // have to save an msg.url for each response
                res = new Response(client, req);

                server.handle(req, res);
            });
            
            client.on('disconnect', function() {
                client.broadcast({ announcement: client.sessionId + ' disconnected' });
            });
        });
    }
};
