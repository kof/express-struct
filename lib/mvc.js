var $ = require('connect').utils,
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


var render = http.ServerResponse.prototype.render;

/**
 * Override render method of express, because we want to make view
 * argument optional and we know the path to default view.
 *
 * @param {string=} view path to the view file is optional.
 * @param {Object|Function=} options or callback function.
 * @param {Function=} fn callback.
 * @param {string=} parent path to parent view.
 * @return {string|undefined} returns view string only if partial is rendered
 * @override
 */
http.ServerResponse.prototype.render = function(view, options, fn, parent) {
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
        if (options.partial) {
            view = module + '/views/' + p.controller + '/partials/' + view;
        } else {
            view = module + '/views/' + view;
        }
    }

    return render.call(this, view, options, fn, parent);
};

/**
 * Setup MVC.
 * @param {Object} server instance.
 * @param {Object} options will extend defaults.
 * @export
 */
exports.setup = function(server, options) {

    var o = $.merge({}, exports.options),
        route, socketConnection;

    $.merge(o, options);

    route = o.routePrefix + o.route;


    function handler(req, res, next) {
        var p = req.params,
            module,
            controller,
            paramsQuery, i;

        // default controller name is module name
        p.controller = p.controller || p.module;
        // default action name is controller name
        p.action = p.action || p.controller;

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

        return controller[p.action](req, res, next);
    }

    server.all(route, handler);
    
    if (o.socket) {
        socketConnection = socket.listen(server, o.socket);
        
        socketConnection.on('connection', function(client) {
            var send = client.send,
                broadcast = client.broadcast,
                req = client.request;

            client.send = function(data) {
                // it is socket.io stuff, just send it
                // it is faster to use [], because otherwise we have to
                // check if it is a string first
                if (data[0] === '~') {
                    return send.call(client, data);
                }

                // this is needed, for callbacks in client
                return send.call(client, {
                    data: data,
                    url: req.url,
                    status: 'success'
                });
            };
            
            client.broadcast = function(data) {
                // it is socket.io stuff, just send it
                // it is faster to use [], because otherwise we have to
                // check if it is a string first
                if (data[0] === '~') {
                    return broadcast.call(client, data);
                }

                // this is needed, for callbacks in client
                return broadcast.call(client, {
                    data: data,
                    url: req.url,
                    status: 'success'
                });                
            };
            
            client.on('message', function(msg) {
                // clone the request object because params
                // and data are different by each msg
                //var req = cloneObject(client.request);
                var queryStr =  msg.url.substr(msg.url.indexOf('?') + 1);
                    
                req.url = msg.url;
                req.query = queryStr ? querystring.parse(queryStr) : {};
                req.body = msg.data;

                server.handle(req, client);
            });
            
            client.on('disconnect', function() {
                client.broadcast({ announcement: client.sessionId + ' disconnected' });
            });
        });
    }
};
