test('setup', 1, function() {
    var handler,
        app = {
            get: function(route, _handler){
                handler = _handler;    
            },
            post: function(){},
            put: function(){},
            del: function(){}
        },
        req = {
            params: {
                module: 'mymodule',
                controller: 'mycontroller',
                action: 'myaction'
            }    
        },
        res = {
            send: function(body) {
                equal(body, 'test passed', 'action was called')
            }
        };
    
    var options = {
        root: __dirname + '/fixtures'    
    };
    
    setup(app, options);
    
    handler(req, res);
});
