var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {
    loggedIn: false
  }
}));

app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
  if (req.session.user) {
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/create', function(req, res) {
  // console.log(req.session.user);
  if (req.session.user) {
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', function(req, res) {
  // check if user is authenticated
  //if (req.session.isLoggedIn) {}
  // if yes
    // redirect back to home page
  // if no
    // render the login page

  res.render('login');
});

app.post('/login', function(req, res) {
  // console.log(req.session);

  db.knex.select('username', 'password').from('users')
  .where('username', req.body.username)
  .then((users) => {
    if (users.length) {
      var password = users[0].password;
      if (req.body.password === password) {
        req.session.user = req.body.username;
        res.redirect('/');
      }
    } else {
      res.redirect('/login');
    }
  });


  // new User(req.body);


});

app.post('/signup', function(req, res) {

  var x = new User({
    username: req.body.username,
    password: req.body.password
  })

  db.knex.select('username', 'password').from('users')
  .where('username', req.body.username)
  .then((users) => {
    if (!users.length) {
      x.save().then(() => {
        req.session.cookie.loggedIn = true;
        res.redirect('/');
      });
    } else {
      res.redirect('/signup');
    }
    console.log(users);
  });


});

app.get('/links', function(req, res) {
  if (req.session.user) {
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });
  } else {
    res.redirect('/login');
  }
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});


/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
