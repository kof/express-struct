var _ = require('underscore'),
    util = require('util'),
    http = require('http'),
    net = require('net'),
    qs = require('querystring'),
    express = require('express');

/**
 * Default options.
 * @type {Object}
 * @api public
 */
exports.options = {
    root: process.cwd(),
    route: '/:module?/:controller?/:action?(/*)?',
    paramQuery: true,
    defaultModule: 'index'
};


var res = http.ServerResponse.prototype,
    render = res.render,
    methodsMap;

// Map from HTTP to CRUD.
methodsMap = {
    'POST': 'create',
    'PUT': 'update',
    'DELETE': 'delete',
    'GET': 'read'
};


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
    var o = _.extend({}, exports.options, options);

    function handler(req, res, next) {
        var p = req.params,
            module,
            controller,
            paramsQuery, i;

        // set default module name if not passed
        p.module = p.module || o.defaultModule;

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
            p.action = controller.CRUD ? methodsMap[req.method] : p.controller;
        }

        return controller[p.action](req, res, next);
    }

    server.all(o.route, handler);
};
