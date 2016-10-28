
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var config = require('./config');
var log = require('./libs/log')(module);
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
//app.use(express.session());
app.use(require('./middleware/sendHttpError'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

var routes = require('./routes')(app);

app.use(function(req, res, next) {
  if (req.url == '/') {
    res.end('Home');
  } else {
    next();
  }
});


app.use(function(req, res, next) {
  if (req.url == '/forbidden') {
    next(new Error('Oops, denied'));
  } else {
    next();
  }
});

app.use(function(req, res) {
  res.send(404, 'Page not found, sry bro')
});

app.use(function(err, req, res, next) {

  if (typeof err == 'number') {
    err = new HttpError(err);
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

http.createServer(app).listen(config.get('port'), function(){
  log.info('Express server listening on port ' + config.get('port'));
});
