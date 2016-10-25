
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
//var user = require('./routes/user');
var http = require('http');
var path = require('path');
var config = require('./config');
var log = require('./libs/log')(module);

// all environments
var app = express();

app.engine('ejs', require('ejs-locals')); //layout partial block
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

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
app.use(app.router);

app.get('/', function(req, res) {
  res.render('index', {
    title: 'Home'
  });
});

app.use(express.static(path.join(__dirname, 'public')));

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
  //NODE_ENV = 'production'
  if (app.get('env') == 'development') {
    var errorHandler = express.errorHandler();
    errorHandler(err, req, res, next);
  } else {
    res.send(500);
  }
});

// development only
//if ('development' == app.get('env')) {
//  app.use(express.errorHandler());//
//}

//app.get('/', routes.index);
//app.get('/users', user.list);

http.createServer(app).listen(config.get('port'), function(){
  log.info('Express server listening on port ' + config.get('port'));
});
