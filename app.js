
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var config = require('./config');
var log = require('./libs/log')(module);
var mongoose = require('./libs/mongoose');
var HttpError = require('./error').HttpError;

// all environments
var app = express();

app.set('view engine', 'pug');

//Middlewares

app.use(express.favicon());

if (app.get('env') == 'development') {
  app.use(express.logger('dev'));
} else {
  app.use(express.logger('default'));
}

app.use(express.bodyParser()); //req.body...
//app.use(express.methodOverride());
app.use(express.cookieParser()); //req.cookies

var sessionStore = require('./libs/sessionStore');

app.use(express.session({
  secret: config.get('session:secret'),
  key: config.get('session:key'),
  store: sessionStore
}));

//app.use(function(req, res, next) {
  //req.session.numberOfVisits = req.session.numberOfVisits + 1 || 1;
  //res.send('Visits: ' + req.session.numberOfVisits);
//});

app.use(require('./middleware/sendHttpError'));

app.use(require('./middleware/loadUser'));

app.use(app.router);
require('./routes')(app);

app.use(express.static(path.join(__dirname, 'public')));

app.use(function(err, req, res, next) {

  if (typeof err == 'number') {
    err = new HttpError(err); //next(404);
  }

  if (err instanceof HttpError) {
    res.sendHttpError(err);
  } else {

    if (app.get('env') == 'development') {
      express.errorHandler()(err, req, res, next);
    } else {
      log.error(err);
      err = new HttpError(500);
      res.sendHttpError(err);
    }
  }

});

var server = http.createServer(app).listen(config.get('port'), function(){
  log.info('Express server listening on port ' + config.get('port'));
});

var io = require('./socket')(server);
app.set('io', io);