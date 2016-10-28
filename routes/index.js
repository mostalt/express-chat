var User = require('../models/user').User;
var HttpError = require('../error').HttpError;
var ObjectID = require('mongodb').ObjectID;


module.exports = function(app) {

  app.get('/', function(req, res) {
    res.render('index', {
      title: 'Home'
    });
  });

  app.get('/users', function(req, res, next) {
    User.find({}, function(err, users) {
      if (err) return next(err);
      res.json(users);
    });
  });

  app.get('/user/:id', function(req, res, next) {
  
    try {
      var id = new ObjectID(req.params.id);
    } catch (e) {
      return next(404);
    }

    User.findById(id, function(err, user) {
      if (err) return next(err);
      if (!user) {
        return next(new HttpError(404, 'User not found'));
      }
      res.json(user);
    });
  });

  app.get('/error', function(req, res, next) {
    next(new HttpError(404, 'Test error'));
  });
  
}
