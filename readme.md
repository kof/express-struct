## MVC project structure on top of express.

It defines a strict dirs structure for you and mapps automatically the routs.


## Features
- auto routing using "modules/controllers/action" pattern
- res.render knows its default template name

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

## Setup

    var struct = require('express-struct'),
        express = require('express');

    var server = express.createServer();

    struct.setup(server, options);
    server.listen(8888);

## Options

    {
        // root directory where mvc is located
        root: process.cwd(),
        route: '/:module?/:controller?/:action?(/*)?',
        // convert paths after action into query
        // /app/user/create/name/tj -> query = {name: 'tj'}
        paramQuery: true,
        // module name used if nothing else passed
        defaultModule: 'index',
        // enabled modules list
        moduleNames: null
    }

## Routing

Default module is defined in options.
Default controller is module name.
Default action is controller name.

/mymodule -> '/mvc/mymodule/controllers/mymodule:mymodule'
/mymodule/mycontroller -> '/mvc/mymodule/controllers/mycontroller:mycontroller'
/mymodule/mycontroller/myaction -> '/mvc/mymodule/controllers/mycontroller:myaction'


