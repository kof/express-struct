var $ = require('connect').utils;

exports.options = {
    controllerSuffix: '',
    routePrefix: '/',
    root: process.cwd(),
    route: '/(:module)?/(:controller)?/(:action)?',
    methods: ['get', 'post', 'put', 'del']            
};


exports.setup = function(app, options) {
    
    var o = $.merge({}, exports.options),
        route;
    
    $.merge(o, options);

        
    function handler(req, res, next) {
        var p = req.params,
            path,
            module,
            controller;
    
        // default controller name is module name
        p.controller = p.controller || p.module;
        // default action name is controller name
        p.action = p.action || p.controller; 
        
        path = o.root + '/' + p.module + '/controllers/' + p.controller + o.controllerSuffix;

        // use cache directly to get more perforemance,
        // because require call is a bit costly
        module = require.cache[path + '.js'];
        controller = module ? module.exports : require(path);
        
        return controller[p.action](req, res);
    }
    
    route = o.routePrefix + o.route;
    o.methods.forEach(function(method) {
        app[method](route, handler);            
    });
};
