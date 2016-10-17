var chatApp = angular.module('chatApp', ['yaru22.angular-timeago']);

chatApp.controller('chatController', function($scope, $timeout, $window, $location, $http) {

    var userid = $location.$$path ?
        $location.$$path.substring(1, $location.$$path.length) : 'muthu';

    $scope.me = {
        'id': userid,
        'n': userid,
        'i': '/img/no_avatar.png'
    }

    $scope.groups = [];
    $scope.activegroup = {};
    $scope.groupusers = {};
    $scope.messages = [];
    $http.get('http://192.168.1.176:8070/user/' + $scope.me.id)
        .then(function(response) {
            if (response.data) {
                $http.get('http://192.168.1.176:8070/groups/' + response.data.id)
                    .then(function(response) {
                        response.data.forEach(function(gp) {
                            $scope.groups.push(gp.value);
                        });
                    });
            }
        }, function(err) {
            $http.post('http://192.168.1.176:8070/user', $scope.me)
                .then(function(response) {
                    console.log(response);
                });
        });

    // Initiate the connection to the server
    var socket = socketCluster.connect();
    socket.on('error', function(err) {
        throw 'Socket error - ' + err;
    });

    socket.on('log', function(log) {
        console.log(log);
    });

    socket.on('connect', function() {
        console.log('CONNECTED');
    });

    socket.on('groupsupdated', function(data) {
        $scope.groups = data;
    });

    socket.emit('sampleClientEvent', {
        message: 'This is an object with a message property'
    });

    $timeout(function() {
        $('#group-container').stop().animate({
            scrollTop: $('#group-container')[0].scrollHeight
        }, 800);
    }, 300);

    $scope.send = function() {
        var message = {
            "i": $scope.me.i,
            "m": $scope.message,
            "t": new Date(),
            "n": $scope.me.n,
            "g": $scope.activegroup.id
        }
        socket.emit($scope.activegroup.id, {
            message: message
        });

        $scope.message = '';

        $http.post('http://192.168.1.176:8070/message/' + $scope.activegroup.id, message, function(response) {
            //ignore, this needs to be removed
        });
    }

    var room = null;
    $scope.opengroup = function(gp) {
        $scope.activegroup = gp;
        $scope.messages = [];
        var activeroom = socket.subscribe(gp.id);
        activeroom.watch(function(data) {
            $scope.messages.push(data);

            $timeout(function() {
                $('#group-container').stop().animate({
                    scrollTop: $('#group-container')[0].scrollHeight
                }, 500);
            }, 100);
        });

        $http.get('http://192.168.1.176:8070/messages/' + gp.id)
            .then(function(response) {
                if (response.data) {
                    response.data.forEach(function(msg) {
                        $scope.messages.push(msg.value);
                    });
                    $timeout(function() {
                        $('#group-container').stop().animate({
                            scrollTop: $('#group-container')[0].scrollHeight
                        }, 500);
                    }, 100);

                    socket.emit('enterroom', { gid: gp.id, uid: $scope.me.id });
                    $http.get('http://192.168.1.176:8070/group/users/' + gp.id)
                        .then(function(response) {
                            if (response.data) {
                                $scope.groupusers[gp.id] = response.data;
                            }
                        });
                }
            });
    }

    $scope.createGroup = function() {
        $http.post('http://192.168.1.176:8070/group', {
                'groupname': $scope.groupname,
                'userid': $scope.me.id
            })
            .then(function(response) {
                $scope.groups.push(response.data);
                $scope.showcreategroup = false;
            });
    }

    $scope.joinGroup = function() {
        $http.post('http://192.168.1.176:8070/group/join', {
                'invitecode': $scope.invitecode,
                'userid': $scope.me.id
            })
            .then(function(response) {
                $scope.groups.push(response.data);
                $scope.showcreategroup = false;
            });
    }

}).directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if (event.which === 13) {
                scope.$apply(function() {
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
})
