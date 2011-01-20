var $ = require('connect').utils,
    http = require('http'),
    express = require('express');

/**
 * Default options.
 * @type {Object}
 * @export
 */
exports.options = {
    controllerSuffix: '',
    routePrefix: '',
    root: process.cwd(),
    route: '/(:module)?/(:controller)?/(:action)?',
    methods: ['get', 'post', 'put', 'del']
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
        view = module + '/views/' + view;
    }

    render.call(this, view, options, fn, parent);
};


/**
 * Setup MVC.
 * @param {Object} app server instance.
 * @param {Object} options will extend defaults.
 * @export
 */
exports.setup = function(app, options) {

    var o = $.merge({}, exports.options),
        route;

    $.merge(o, options);

    route = o.routePrefix + o.route;


    function handler(req, res, next) {
        var p = req.params,
            module,
            controller;

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

        return controller[p.action](req, res);
    }

    o.methods.forEach(function(method) {
        app[method](route, handler);
    });
};
