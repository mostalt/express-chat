var log = require('../libs/log')(module);

module.exports = function(server) {
    var io = require('socket.io')(server);
 
    io.set('origins', 'localhost:*');
    io.on('connection', function(socket) {
        console.log('a user connected');

        socket.on('message', function(text, callback) {
            socket.broadcast.emit('message', text);
            callback();
        });
    });

};
