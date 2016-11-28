var log = require('../libs/log')(module);
var config = require('../config');
var connect = require('connect'); // npm i connect
var async = require('async');
var cookie = require('cookie'); // npm i cookie
var cookieParser = require('cookie-parser');
var sessionStore = require('../libs/sessionStore');
var HttpError = require('../error').HttpError;
var User = require('../models/user').User;


function loadSession(sid, callback) {

  // sessionStore callback is not quite async-style!
  sessionStore.load(sid, function(err, session) {
    if (arguments.length == 0) {
      // no arguments => no session
      return callback(null, null);
    } else {
      return callback(null, session);
    }

  });

}

function loadUser(session, callback) {

  if (!session.user) {
    log.debug("Session %s is anonymous", session.id);
    return callback(null, null);
  }

  log.debug("retrieving user ", session.user);

  User.findById(session.user, function(err, user) {
    if (err) return callback(err);

    if (!user) {
      return callback(null, null);
    }
    log.debug("user findbyId result: " + user);
    callback(null, user);
  });

}

module.exports = function(server) {
    var io = require('socket.io')(server);
    var secret = config.get('session:secret');
    var sessionKey = config.get('session:key');

    io.set('origins', 'localhost:*');

    var disconnectRoom = function (name) {
        name = '/' + name;

        var users = io.manager.rooms[name];

        for (var i = 0; i < users.length; i++) {
            io.sockets.socket(users[i]).disconnect();
        }

        return this;
    };

    io.use(function(socket, next) {

        var handshakeData = socket.handshake;

        async.waterfall([
            function(callback) {
                //get sid
                var parser = cookieParser(secret);
                parser(handshakeData, {}, function (err) {
                    if (err) return callback(err);

                    var sid = handshakeData.signedCookies[sessionKey];

                    loadSession(sid, callback);
                });
            },
            function(session, callback) {
                if (!session) {
                    return callback(new HttpError(401, "No session"));
                }
                socket.handshake.session = session;
                loadUser(session, callback);
            },
            function(user, callback) {
                if (!user) {
                    return callback(new HttpError(403, "Anonymous session may not connect"));
                }
                
                callback(null, user);
            }   

        ], function(err, user) {
            if (err) {

                if (err instanceof HttpError) {
                    return next(new Error('not authorized'));
                }

                next(err);
                
            }


            socket.handshake.user = user;
            next();


        });

    });

    io.on('connection', function(socket) {

        var username = socket.handshake.user.username || 'nothing';
        var userRoom = "user: " + username;

        socket.join(userRoom);

        console.log('User: ' + username + ' connected');

        socket.broadcast.emit('join', username);

        socket.on('message', function(text, callback) {
            socket.broadcast.emit('message', username, text);
            callback && callback();
        });

        socket.on('disconnect', function() {
            socket.broadcast.emit('leave', username);
        });

    });

    return io;

};
