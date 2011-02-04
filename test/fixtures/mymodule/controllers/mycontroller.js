exports.myaction = function(req, res) {
    res.send('test passed');
};

exports.getview = function(req, res) {
    res.render();
};

exports.partial = function(req, res) {
    res.send(res.partial('partial'));
};

exports.viewwithpartial = function(req, res) {
    res.render();
};

exports.viewwithpartial2 = function(req, res) {
    res.render();
};