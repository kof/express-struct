exports.myaction = function(req, res) {
    res.send('test passed');
};

exports.getview = function(req, res) {
    res.render();
};

exports.brokenaction = function() {
    throw new Error('I am broken');
};
