/**
 * by yutingzhao 2012 8 18
 */

var path = require('path');
var express = require('express');
var config = require('./config').config;
var control = require('./modules/control');

var app = express.createServer();
control.start(app);
// configuration in all env
app.configure('development', function(){
    app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
// routes
app.listen(process.argv[2] || config.port);

console.log("围棋 start at port:"+config.port);
