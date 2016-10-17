//     Copyright (c) 2016-2017 Muthukrishnan muthu.com
//     MIT License - http://opensource.org/licenses/mit-license.php
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var SocketCluster = require('socketcluster').SocketCluster;
var restify = require('restify');
var db = require('./db')();

var workerControllerPath = argv.wc || process.env.SOCKETCLUSTER_WORKER_CONTROLLER;
var brokerControllerPath = argv.bc || process.env.SOCKETCLUSTER_BROKER_CONTROLLER;
var initControllerPath = argv.ic || process.env.SOCKETCLUSTER_INIT_CONTROLLER;

var options = {
    workers: Number(argv.w) || Number(process.env.SOCKETCLUSTER_WORKERS) || 1,
    brokers: Number(argv.b) || Number(process.env.SOCKETCLUSTER_BROKERS) || 1,
    port: Number(argv.p) || Number(process.env.SOCKETCLUSTER_PORT) || 8000,
    // If your system doesn't support 'uws', you can switch to 'ws' (which is slower but works on older systems).
    wsEngine: process.env.SOCKETCLUSTER_WS_ENGINE || 'uws',
    appName: argv.n || process.env.SOCKETCLUSTER_APP_NAME || null,
    workerController: workerControllerPath || __dirname + '/worker.js',
    brokerController: brokerControllerPath || __dirname + '/broker.js',
    initController: initControllerPath || null,
    socketChannelLimit: Number(process.env.SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT) || 1000,
    clusterStateServerHost: argv.cssh || process.env.SCC_STATE_SERVER_HOST || null,
    clusterStateServerPort: process.env.SCC_STATE_SERVER_PORT || null,
    clusterAuthKey: process.env.SCC_AUTH_KEY || null,
    clusterStateServerConnectTimeout: Number(process.env.SCC_STATE_SERVER_CONNECT_TIMEOUT) || null,
    clusterStateServerAckTimeout: Number(process.env.SCC_STATE_SERVER_ACK_TIMEOUT) || null,
    clusterStateServerReconnectRandomness: Number(process.env.SCC_STATE_SERVER_RECONNECT_RANDOMNESS) || null,
    crashWorkerOnError: argv['auto-reboot'] != false
};

var SOCKETCLUSTER_OPTIONS;

if (process.env.SOCKETCLUSTER_OPTIONS) {
    SOCKETCLUSTER_OPTIONS = JSON.parse(process.env.SOCKETCLUSTER_OPTIONS);
}

for (var i in SOCKETCLUSTER_OPTIONS) {
    if (SOCKETCLUSTER_OPTIONS.hasOwnProperty(i)) {
        options[i] = SOCKETCLUSTER_OPTIONS[i];
    }
}

var masterControllerPath = argv.mc || process.env.SOCKETCLUSTER_MASTER_CONTROLLER;

var start = function() {
    var socketCluster = new SocketCluster(options);

    if (masterControllerPath) {
        var masterController = require(masterControllerPath);
        masterController.run(socketCluster);
    }
};

var bootCheckInterval = Number(process.env.SOCKETCLUSTER_BOOT_CHECK_INTERVAL) || 200;

if (workerControllerPath) {
    // Detect when Docker volumes are ready.
    var startWhenFileIsReady = (filePath) => {
        return new Promise((resolve) => {
            if (!filePath) {
                resolve();
                return;
            }
            var checkIsReady = () => {
                fs.exists(filePath, (exists) => {
                    if (exists) {
                        resolve();
                    } else {
                        setTimeout(checkIsReady, bootCheckInterval);
                    }
                });
            };
            checkIsReady();
        });
    };
    var filesReadyPromises = [
        startWhenFileIsReady(masterControllerPath),
        startWhenFileIsReady(workerControllerPath),
        startWhenFileIsReady(brokerControllerPath),
        startWhenFileIsReady(initControllerPath)
    ];
    Promise.all(filesReadyPromises).then(() => {
        start();
    });
} else {
    start();
}


///---------Initializing the REST server------------///
var server = restify.createServer({
    name: 'TalkDodo Data Server!',
    version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.jsonp());
server.use(restify.bodyParser({ mapParams: true }));
server.use(
    function crossOrigin(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        return next();
    }
);

server.post('/user', function(req, res, next) {
    db.saveuser(req.body.id, function(data) {
        res.send(data);
    });
});

server.get('/user/:userid', function(req, res, next) {
    db.getuser(req.params.userid, function(data) {
        res.send(data);
    });
});

server.post('/group', function(req, res, next) {
    db.savegroupname(req.body.groupname,req.params.userid, function(data) {
        res.send(data);
    });
});

server.post('/group/join', function(req, res, next) {
    db.joingroup(req.body.invitecode,req.params.userid, function(data) {
        res.send(data);
    });
});

server.get('/groups/:userid', function(req, res, next) {
    db.getusergroups(req.params.userid, function(data) {
        res.send(data);
    });
});

server.get('/messages/:groupid', function(req, res, next) {
    db.getgroupsmessages(req.params.groupid, function(data) {
        res.send(data);
    });
});

server.post('/message/:groupid', function(req, res, next) {
    db.saveusergroupsmessage(req.params.groupid, req.body, function(data) {
        res.send(data);
    });
});

server.get('/group/users/:groupid', function(req, res, next) {
    db.getgroupusers(req.params.groupid, function(data) {
        res.send(data);
    });
});

server.listen(8070, function() {
    console.log('%s listening at %s', server.name, server.url);
});
