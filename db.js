var levelup = require('levelup');
var uuid = require('uuid');
var db = levelup('./talkdododb', { valueEncoding: 'json' });

module.exports = function() {

    return {

        saveuser: function(userid, done) {
            if (!userid) {
                userid = uuid.v4();
            }
            var data = {
                id: userid,
                ts: (new Date()).getTime()
            }
            var key = userid;
            db.put(key, data, function(err) {
                if (err) {
                    return done(err);
                }
                return done(data);
            })
        },

        getuser: function(userid, done) {
            db.get(userid, function(err, data) {
                if (err) {
                    return done(err);
                }
                return done(data);
            })
        },

        savegroupname: function(groupname, userid, done) {
            var groupid = uuid.v4();
            var groupidentifier = userid.substring(0, 2) + '' + groupid.substring(0, 4) + '' + groupname.substring(0, 2);
            groupidentifier = groupidentifier.toUpperCase();
            var data = {
                id: groupid,
                ow: userid,
                tf: groupidentifier,
                gn: groupname,
                ts: (new Date()).getTime()
            }
            var key = userid + '!groups!' + data.ts
            db.put(key, data, function(err) {
                if (!err) {
                    db.put(groupidentifier, key, function(err) {
                        if (!err) {
                        	var key = groupid + '!member!' + userid
				            db.put(key, userid, function(err) {
				                if (!err) {
				                    return done(data);
				                } else {
				                    return done(err);
				                }
				            })
                        } else {
                            return done(err);
                        }
                    });
                } else {
                    return done(err);
                }
            })
        },

        joingroup: function(invitecode, userid, done) {
            db.get(invitecode, function(err, data) {
                if (!err) {
                    db.get(data, function(err, groupdata) {
                        var key = userid + '!groups!' + groupdata.ts
                        db.put(key, groupdata, function(err) {
                            if (!err) {
                            	var key = groupdata.id + '!member!' + userid
					            db.put(key, userid, function(err) {
					                if (!err) {
					                    return done(groupdata);
					                } else {
					                    return done(err);
					                }
					            })
                            } else {
                                return done(err);
                            }
                        })
                    });
                } else {
                    return done(err);
                }
            })
        },

        getusergroups: function(userid, done) {
            var groups = []
            db.createReadStream({ start: userid + '!groups!', end: userid + '!groups!' + '\xff' })
                .on('data', function(group) {
                    groups.push(group)
                })
                .on('close', function() {
                    return done(groups);
                })
        },

        saveusergroupsmessage: function(groupid, data, done) {
            var messageid = uuid.v4();
            var message = data.message;
            var tosave = {
                id: messageid,
                mg: message,
                u: data.user,
                ts: (new Date()).getTime()
            }

            var key = groupid + '!message!' + tosave.ts
            db.put(key, data, function(err) {
                if (!err) {
                    return done(data);
                } else {
                    return done(err);
                }
            })
        },

        getgroupsmessages: function(groupid, done) {
            var messages = [];
            db.createReadStream({ start: groupid + '!message!', end: groupid + '!message!' + '\xff' })
                .on('data', function(msgs) {
                    messages.push(msgs)
                })
                .on('close', function() {
                    return done(messages);
                })
        },

        getgroupusers: function(groupid, done) {
            var users = []
            db.createReadStream({ start: groupid + '!member!', end: groupid + '!member!' + '\xff' })
                .on('data', function(user) {
                    users.push(user)
                })
                .on('close', function() {
                    return done(users);
                })
        },
    }
}
