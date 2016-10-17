var fs = require('fs');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
// var db = require('./db')();

module.exports.run = function(worker) {
    console.log('   >> Worker PID:', process.pid);

    var app = require('express')();

    var httpServer = worker.httpServer;
    var scServer = worker.scServer;

    app.use(serveStatic(path.resolve(__dirname, 'public')));

    httpServer.on('request', app);

    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    scServer.on('connection', function(socket) {

        socket.on('enterroom', function(data) {
            socket.on(data.gid, function(data) {
                scServer.exchange.publish(data.message.g, data.message);
                // db.saveusergroupsmessage(roomid, data, function(res){
                //   //dont do anything
                // });
            });
        });

        socket.on('disconnect', function() {
            //clearInterval(interval);
        });
    });
};
