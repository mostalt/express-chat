var User = require('./models/user').User;

var user = new User({
    username: 'Tester1',
    password: 'sectret'
});

user.save(function(err, user) {
    if (err) throw err;

    User.findOne({username: 'Tester'}, function(err, tester) {
        console.log(tester);
    })
});