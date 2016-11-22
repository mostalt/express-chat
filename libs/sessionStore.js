var express = require('express');
var mongoose = require('./mongoose');
var MongoStore = require('connect-mongo')(express);

var sessionStore = new MongoStore({
    mongooseConnection: mongoose.connection
  });

  module.exports = sessionStore;