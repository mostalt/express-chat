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

// function loadSession(sid) {

//   sessionStore.load(sid, function(err, session) {
//     if (err) {
//       return next(err);
//     } else {
//       return session;
//     }

//   });

// }

// function loadUser(session) {
//   console.log(session.user);
//   if (!session.user) {
//     log.debug("Session %s is anonymous", session.id);
//     next(new Error('not authorized'));
//   }

//   log.debug("retrieving user ", session.user);

//   User.findById(session.user, function(err, user) {
//     if (err) return next(err);

//     if (!user) {
//       return next(new HttpError(403, "Anonymous session may not connect"));
//     }
    
//     log.debug("user findbyId result: " + user);

//     return user;
//   });

// }

module.exports = function(server) {
    var io = require('socket.io')(server);
    io.set('origins', 'localhost:*');

    io.use(function(socket, next) {

        var handshakeData = socket.handshake;

        async.waterfall([
            function(callback) {
                // handshakeData.cookies - объект с cookie
                handshakeData.cookies = cookie.parse(handshakeData.headers.cookie || '');
                var sidCookie = handshakeData.cookies[config.get('session:key')];
                var sid = cookieParser.signedCookie(sidCookie, config.get('session:secret'));
                loadSession(sid, callback);
            },
            function(session, callback) {
                if (!session) {
                    callback(new HttpError(401, "No session"));
                }
                handshakeData.session = session;
                loadUser(session, callback);
            },
            function(user, callback) {
                if (!user) {
                    callback(new HttpError(403, "Anonymous session may not connect"));
                }
                handshakeData.user = user;
                next();
            }   

        ], function(err) {
            if (!err) {
                return  callback(null, true);
                
            }

            if (err instanceof HttpError) {
                return callback(null, false);
            }

            callback(err);
        });

    });

    // io.use( function(socket, next) {
    //     var handshakeData = socket.handshake;
    //     handshakeData.cookies = cookie.parse(handshakeData.headers.cookie || '');
    //     var sidCookie = handshakeData.cookies[config.get('session:key')];
    //     var sid = cookieParser.signedCookie(sidCookie, config.get('session:secret'));

    //     loadSession(sid);
    //     console.log(session);

    //     if (!session) {
    //       next(new HttpError(401, "No session"));
    //     }

    //     handshakeData.session = session;
    //     loadUser(session);

    //     if (!user) {
    //       next(new HttpError(403, "Anonymous session may not connect"));
    //     }

    //     handshakeData.user = user;
    //     next();

    // });

    io.on('connection', function(socket) {

        var username = socket.handshake.user.username || 'nothing';

        console.log('User:' + username + ' connected');

        //console.log(socket.handshake);
        socket.on('message', function(text, callback) {
            socket.broadcast.emit('message', username, text);
            callback();
        });

        socket.on('disconnect', function() {
            socket.broadcast.emit('leave', username);
        });

        socket.broadcast.emit('join', username);

    });

    return io;

};
