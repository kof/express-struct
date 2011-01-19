var $ = require('connect').utils;

exports.options = {
    root: process.cwd(),
    route: '/(:module)?/(:controller)?/(:action)?'        
};


exports.setup = function(name, app, options) {
    
    var o = $.merge({}, exports.options);
    
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
        
        path = o.root + '/' + p.module + '/controllers/' + p.controller;

        // use cache directly to get more perforemance,
        // because require call is a bit costly
        module = require.cache[path + '.js'];
        controller = module ? module.exports : require(path);
        
        return controller[p.action](req, res);
    }
    
    o.route = '/' + name + o.route;
    
    app.get(o.route, handler);    
    app.post(o.route, handler);    
    app.put(o.route, handler);    
    app.del(o.route, handler);
};
