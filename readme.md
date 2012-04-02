## MVC is an additional frameowork layer based on express for larger sites.

## Features
- auto routing using modules/controllers/action pattern

## Usage

### Routing

The default route is /mymodule/controllers/mycontroller->myaction, where controller and action are optional.
The default value for controller name is module name and default for action  is controller name.
This design descision is prefered to 'index' for all defaults, because otherwise you end in hundreds of index files
and this is not easy then to find one specific index file.

### res.render

The only difference to express here is that the first param, view path, is optional.
The default view is always /mymodule/views/mycontroller/myaction.html.
