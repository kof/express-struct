[![build status](https://secure.travis-ci.org/kof/express-struct.png)](http://travis-ci.org/kof/express-struct)
## MVC project structure on top of express.

It defines a strict directories structure for you and maps automatically the routes.

## Features
- dirs structure
- auto routing using "modules/controllers/action" pattern
- res.render knows its default template name
- CRUD

## Structure

- mvc
  - {mymodule}
    - controllers
      - {mycontroller}.js
    - views
      - {mycontroller}
         - {myview.html}
      - layout.html
    - models
    - helpers
    - tests
  - {mymodule1}

## Setup

    var struct = require('express-struct'),
        express = require('express');

    var app = express();

    struct.setup(app, options);

    app.listen(8888);

    // /mvc/mymodule/controllers/mycontroller.js
    exports.myaction = function(req, res, next) {
        // will render /mvc/mymodule/views/mycontroller/myaction.html
        res.render();
    };


## Options

    {

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
    }

## Routing

Default module is defined in options.
Default controller is module name.
Default action is controller name.

'/mymodule' -> '/mvc/mymodule/controllers/mymodule:mymodule'

'/mymodule/mycontroller' -> '/mvc/mymodule/controllers/mycontroller:mycontroller'

'/mymodule/mycontroller/myaction' -> '/mvc/mymodule/controllers/mycontroller:myaction'

## CRUD support

Define `exports.CRUD = true;` in your controller to support http methods to CRUD mapping for actions.

get: '/mymodule/mycontroller' -> '/mvc/mymodule/controllers/mycontroller:read'

post: '/mymodule/mycontroller' -> '/mvc/mymodule/controllers/mycontroller:create'

put: '/mymodule/mycontroller' -> '/mvc/mymodule/controllers/mycontroller:udpate'

delete: '/mymodule/mycontroller' -> '/mvc/mymodule/controllers/mycontroller:delete'


