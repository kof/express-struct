var _ = require('underscore'),
    http = require('http'),
    express = require('express'),
    findit = require('findit');

var res = express.response,
    render = res.render,
    methodsMap;

/**
 * Default options.
 *
 * @type {Object}
 * @api public
 */
exports.options = {

    // Root directory where mvc is located.
    root: process.cwd(),
    route: '/:module?/:controller?/:action?(/*)?',

    // Convert paths after action into query
    // /app/user/create/name/kof -> query = {name: 'kof'}
    paramQuery: true,

    // Module name used if nothing else passed.
    defaultModule: 'index',

    // Enabled modules list.
    moduleNames: null,

    // Error handler.
    error: function() {}
};

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
 * @param {String?} view path to the view file is optional.
 * @param {Object?} options or callback function.
 * @param {Function} fn callback.
 * @return {String|Undefined} returns view string only if partial is rendered
 * @api public
 */
res.render = function(view, options, fn) {
    var req = this.req,
        p = req.params,
        module = req.__struct.root + '/' + p.module;

    if (typeof view == 'string') {
        view = module + '/views/' + view;
    } else {
        fn = options;
        options = view;
        view = module + '/views/' + p.controller + '/' + p.action + '.' +
           req.app.settings['view engine'];
    }

    return render.call(this, view, options, fn);
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

    // Set default module name if not passed.
    p.module || (p.module = o.defaultModule);

    // Default controller name is module name.
    p.controller || (p.controller = p.module);

    controllerPath = o.root + '/' + p.module + '/controllers/' + p.controller;
    module = require.cache[controllerPath + '.js'];

    if (!module) {
        o.error(error('Controller not found.', controllerPath), req, res, next);

        // Continue middleware cycle here because other routes need to.
        return next();
    }

    controller = module.exports;

    req.__struct = o;

    // If CRUD is specified, action corresponds http methods.
    if (controller.CRUD) {
        p[0] = p[0] ? p.action + p[0] : p.action;
        p.action = methodsMap[req.method];
    } else if (!p.action) {

        // Default action name is controller name.
        p.action = p.controller;
    }

    if (o.paramQuery && p[0] && p[0] !== '/') {

        // Remove last and first slash.
        paramsQuery = p[0].replace(/^\/|\/$/g, '').split('/');
        for (i = 0; i < paramsQuery.length; i += 2) {
            req.query[paramsQuery[i]] = paramsQuery[i+1];
        }
    }

    if (!controller[p.action]) {
        o.error(error('Action not found.', controllerPath + ': ' + p.action), req, res, next);

        // Continue middleware cycle.
        return next();
    }

    try {
        controller[p.action](req, res, next);
    } catch(err) {
        next(err);
    }
}

/**
 * Setup struct.
 *
 * @param {Object} express app.
 * @param {Object} options will extend defaults.
 * @api public
 */
exports.setup = function(app, options) {
    var opts = _.extend(exports.options, options);

    cacheControllers(opts);
    app.all(opts.route, handle);
};
