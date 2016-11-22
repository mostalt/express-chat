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
    io.set('origins', 'localhost:*');

    io.use(function(socket, next) {

        var handshakeData = socket.handshake;

        async.waterfall([
            function(callback) {
                // сделать handshakeData.cookies - объектом с cookie
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

    io.on('connection', function(socket) {

        var username = socket.handshake.user.username || 'nothing';

        console.log('User:' + username + ' connected');

        //console.log(socket.handshake);
        socket.on('message', function(text, callback) {
            socket.broadcast.emit('message', text);
            callback();
        });
    });

};
