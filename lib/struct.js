var _ = require('underscore'),
    http = require('http'),
    // make sure to call express, before to patch render method
    express = require('express'),
    findit = require('findit');

/**
 * Default options.
 *
 * @type {Object}
 * @api public
 */
exports.options = {
    // root directory where mvc is located
    root: process.cwd(),
    route: '/:module?/:controller?/:action?(/*)?',
    // convert paths after action into query
    // /app/user/create/name/tj -> query = {name: 'tj'}
    paramQuery: true,
    // module name used if nothing else passed
    defaultModule: 'index',
    // enabled modules list
    moduleNames: null,
    // error handler
    error: function() {}
};


var res = http.ServerResponse.prototype,
    render = res.render,
    methodsMap;

/**
 * Map from HTTP to CRUD.
 *
 * @type {Object}
 */
methodsMap = {
    POST: 'create',
    PUT: 'update',
    DELETE: 'delete',
    GET: 'read'
};


/**
 * Override render method of express, because we want to make view
 * argument optional and we know the path to default view.
 *
 * @param {String|Object} view path to the view file is optional.
 * @param {Object|Function} options or callback function.
 * @param {Function} fn callback.
 * @param {String} parent path to parent view.
 * @return {String|Undefined} returns view string only if partial is rendered
 * @api public
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
        if (options.isPartial) {
            view = module + '/views/' + p.controller + '/' + view;
        } else {
            view = module + '/views/' + view;
        }

    }

    return render.call(this, view, options, fn, parent, sub);
};

/**
 * Preload controllers, node will cache them.
 * Avoid sync stuff after bootstrap.
 *
 * @param {Object} options.
 */
function cacheControllers(opts) {
    findit.sync(opts.root).forEach(function(path) {
        var parts;

        if (!/\.js$/.test(path)) {
            return;
        }

        parts = path.split('/');

        if (parts[parts.length - 2] != 'controllers') {
            return;
        }

        if (opts.moduleNames && opts.moduleNames.indexOf(parts[parts.length - 3]) < 0) {
            return;
        }

        require(path);
    });
}

/**
 * Create error, add standard props.
 *
 * @param {String} message
 * @param {String} path which has triggered the issue.
 * @return {Error}
 */
function error(message, path) {
    var err = new Error(message);
    err.code = 404;
    err.type = 'NOT_FOUND';
    err.path = path;
    return err;
}

/**
 * Request handler which is passed to the routing API of express.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
function handle(req, res, next) {
    var o = exports.options,
        p = req.params,
        module,
        controller,
        controllerPath,
        paramsQuery, i;

    // set default module name if not passed
    p.module || (p.module = o.defaultModule);

    // default controller name is module name
    p.controller || (p.controller = p.module);

    controllerPath = o.root + '/' + p.module + '/controllers/' + p.controller;
    module = require.cache[controllerPath + '.js'];

    if (!module) {
        o.error(error('Controller not found.', controllerPath), req, res, next);
        // continue middleware cycle
        return next();
    }

    controller = module.exports;

    req.mvc = o;

    if (o.paramQuery && p[0] && p[0] !== '/') {
        // remove last and first slash
        paramsQuery = p[0].replace(/^\/|\/$/g, '').split('/');
        for (i = 0; i < paramsQuery.length; i += 2) {
            req.query[paramsQuery[i]] = paramsQuery[i+1];
        }
    }

    // if CRUD is specified, action corresponds http methods
    if (controller.CRUD) {
        p.action = methodsMap[req.method];
    } else if (!p.action) {
        // default action name is controller name
        p.action = p.controller;
    }

    if (!controller[p.action]) {
        o.error(error('Action not found.', controllerPath + ': ' + p.action), req, res, next);
        // continue middleware cycle
        return next();
    }

    try {
        controller[p.action](req, res, next);
    } catch(err) {
        next(err);
    }
}

/**
 * Setup MVC.
 * @param {Object} server instance.
 * @param {Object} options will extend defaults.
 * @api public
 */
exports.setup = function(server, options) {
    var opts = _.extend(exports.options, options);

    cacheControllers(opts);
    server.all(opts.route, handle);
};
