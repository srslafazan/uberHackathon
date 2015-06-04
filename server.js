// UBER API STARTER KIT FOR NODE/EXPRESS
// We use passport to handle oauth for uber, passport uses express-session, and we use the passport-uber strategy. Https for sending api requests from our server and bodyparser for post data.
var express = require('express');
var session = require('express-session');
var passport = require('passport');
var uberStrategy = require('passport-uber');
var https = require('https');
var bodyParser = require('body-parser');
var app = express();
var config = require('./config.js');
// Get all auth stuff from config file

// DB
var mongoose  = require('mongoose'),
  Schema    = mongoose.Schema;

// ClientID & ClientSecret for API requests with OAUTH
var clientID = config.ClientID;
var clientSecret = config.ClientSecret;
// ServerID for API requests without OAUTH
var ServerID = config.ServerID;
// sessionSecret used by passport
var sessionSecret = "UBERAPIROCKS" 

app.use(session({
	secret: sessionSecret,
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/client'));
app.set('views', __dirname + '/client/views');
app.set('view engine','ejs');

// bodyparser for handling post data
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// post to show unauthorized request
app.post('/cars', function (request, response) {
  getRequest('/v1/products?latitude='+request.body.start_latitude+'&longitude='+request.body.start_longitude, function(err, res) {
    response.json(res);
  });
});

app.post('/register', function (req, res){
  console.log(req.body);
});

// use this for an api get request without oauth
function getRequest(endpoint, callback) {
  var options = {
    hostname: "sandbox-api.uber.com",
    path: endpoint,
    method: "GET",
    headers: {
      Authorization: "Token " + ServerID
    }
  }

  var req = https.request(options, function (res) {
    res.on('data', function(data) {
      console.log('data!');
      console.log(JSON.parse(data));
      callback(null, JSON.parse(data));
    })
  })
  req.end();
  req.on('error', function(err) {
    callback(err, null);
  });
}
// _______________ BEGIN PASSPORT STUFF ________________
// Serialize and deserialize users used by passport
passport.serializeUser(function (user, done){
	done(null, user);
});
passport.deserializeUser(function (user, done){
	done(null, user);
});

// define what strategy passport will use -- this comes from passport-uber
passport.use(new uberStrategy({
		clientID: clientID,
		clientSecret: clientSecret,
		callbackURL: "http://localhost:8000/auth/uber/callback"
	},
	function (accessToken, refreshToken, user, done) {
		console.log('user:', user.first_name, user.last_name);
		console.log('access token:', accessToken);
		console.log('refresh token:', refreshToken);
    // THIS IS WHERE YOU WOULD PUT SOME DB LOGIC TO SAVE THE USER
		user.accessToken = accessToken;
		return done(null, user);
	}
));

// login page 
app.get('/login', function (request, response) {
	response.render('login');
});

// get request to start the whole oauth process with passport
app.get('/auth/uber',
	passport.authenticate('uber',
		{ scope: ['profile', 'history', 'history_lite', 'request', 'request_receipt'] }
	)
);

// authentication callback redirects to /login if authentication failed or home if successful
app.get('/auth/uber/callback',
	passport.authenticate('uber', {
		failureRedirect: '/login'
	}), function(req, res) {
    res.redirect('/');
  });

// home after the user is authenticated
app.get('/', ensureAuthenticated, function (request, response) {
	response.render('index');
});


app.get('/user', ensureAuthenticated, function (request, response){
  var userProfile,
      userHistory;

  getAuthorizedRequest('/v1/me', request.user.accessToken, function (error, res) {
    if (error) { 
      console.log(error); 
      } else {
        userProfile = res;
        }
  });

  getAuthorizedRequest('/v1.2/history', request.user.accessToken, function (error, res) {
    if (error) { 
      console.log("err", error); 
      } else {
      userHistory = res;
      }
  });
  
  var userInfo = {};
  
  if ( userProfile ) {
    userInfo['userProfile'] = userProfile;
  } else { // load default profile for demo
    userInfo['userProfile'] = {
      "picture":"https://d1w2poirtb3as9.cloudfront.net/default.jpeg",
      "first_name":"Shain",
      "last_name":"Lafazan",
      "promo_code":"shainl1ue",
      "email":"srslafazan@gmail.com",
      "uuid":"30e3e5f1-63f2-414c-8532-9efd1ef15a5f"
    };
  }
  if ( userHistory ) {
    userInfo['userHistory'] = userHistory;
  } else { // load default profile for demo
      userInfo['userHistory'] = {
        "offset": 0,
        "limit": 1,
        "count": 4,
        "history": [
        {
          "status":"completed",
          "distance":1.64691465,
          "request_time":1428876188,
          "start_time":1428876374,
          "start_city":{
            "latitude":37.7749295,
            "display_name":"San Francisco",
            "longitude":-122.4194155
          },
       "end_time":1428876927,
       "request_id":"37d57a99-2647-4114-9dd2-c43bccf4c30b",
       "currency_code":"USD",
       "product_id":"a1111c8c-c720-46c3-8534-2fcdd730040d"
        },
        {
          "product_id":"821415d8-3bd5-4e27-9604-194e4359a449" // example businesses helped for demo
        },
        {
          "product_id":"23a231fd-9fa8-45a7-b212-e3f9cb69873f" // example businesses helped for demo
        },
        {
          "product_id":"c9b74e41-816c-4df8-8290-41fc1df9476c" // example businesses helped for demo
        },
      ]
    };
  }
  var businessesHelped = [];
  var transactionHistory = userInfo.userHistory.history;
  for ( var i = 0; i < transactionHistory.length; i++ ){
    businessesHelped.push({});
    switch(transactionHistory[i].product_id){
      case "a1111c8c-c720-46c3-8534-2fcdd730040d": businessesHelped[i].name = "Ripley's Leaf it or Not";
      break;
      case "821415d8-3bd5-4e27-9604-194e4359a449": businessesHelped[i].name = "Edward's Hair Stylers";
      break;
      case "23a231fd-9fa8-45a7-b212-e3f9cb69873f": businessesHelped[i].name = "Caesar's Plumbers";
      break;
      case "c9b74e41-816c-4df8-8290-41fc1df9476c": businessesHelped[i].name = "Titanium Locksmiths";
      break;
      default: businessesHelped[i].name = "Joe's Taco Shack";
      break;
    }
  }
  userInfo['businessesHelped'] = businessesHelped;
  console.log(userInfo);  
  response.render('user', userInfo);
});

// /profile API endpoint
app.get('/profile', ensureAuthenticated, function (request, response) {
	getAuthorizedRequest('/v1/me', request.user.accessToken, function (error, res) {
		if (error) { console.log(error); }
		response.json(res);
	});
});

// /history API endpoint
app.get('/history', ensureAuthenticated, function (request, response) {
	getAuthorizedRequest('/v1.2/history', request.user.accessToken, function (error, res) {
		if (error) { console.log("err", error); }
    console.log(res);
		response.json(res);
	});
});

// ride request API endpoint
app.post('/request', ensureAuthenticated, function (request, response) {
	// NOTE! Keep in mind that, although this link is a GET request, the actual ride request must be a POST, as shown below
	console.log('in the request');
  console.log(request.body);
  var businessName = request.body.businessName;
  console.log('\n\n the business Name is: ' + businessName + '\n\n');

  var parameters = {
		start_latitude : request.body.start_latitude,
		start_longitude: request.body.start_longitude,
		end_latitude: request.body.end_latitude + 1,
		end_longitude: request.body.end_longitude + 1,
		product_id: request.body.currentService,
	};

  postAuthorizedRequest('/v1/requests', request.user.accessToken, parameters, function (error, res) {

    var request_id = res.request_id;
    console.log(request_id);

    getAuthorizedRequest('/v1/requests/' + request_id + '/map', request.user.accessToken, function (req, res) {
      console.log('========================================');
      console.log(res);
      console.log('========================================');
    });



    response.render('success', { 'businessName':businessName, 'eta':res.eta, 'mapInfo':'mapInfoPlaceholder' });
	});


});

// logout
app.get('/logout', function (request, response) {
	request.logout();
	response.redirect('/login');
});

// route middleware to make sure the request is from an authenticated user
function ensureAuthenticated (request, response, next) {
  console.log('inside ensure Authenticated');
	if (request.isAuthenticated()) {
		return next();
	}
	response.redirect('/login');
}
// use this for an api get request
function getAuthorizedRequest(endpoint, accessToken, callback) {
  var options = {
    hostname: "sandbox-api.uber.com",
    path: endpoint,
    method: "GET",
    headers: {
      Authorization: "Bearer " + accessToken
    }
  }
  var req = https.request(options, function(res) {
    res.on('data', function(data) {

      // console.log(JSON.parse(data));
      callback(null, JSON.parse(data));
    })
  })
  req.end();
  req.on('error', function(err) {
    callback(err, null);
  });
}
// use this for an api post request
function postAuthorizedRequest(endpoint, accessToken, parameters, callback) {
  var options = {
    hostname: "sandbox-api.uber.com",
    path: endpoint,
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      'Content-Type': 'application/json'
    }
  }
  var req = https.request(options, function(res) {
    res.on('data', function(data) {
      console.log('data!');
      console.log(JSON.parse(data));
      callback(null, JSON.parse(data));
    })
  })
  req.write(JSON.stringify(parameters));
  req.end();
  req.on('error', function(err) {
    callback(err, null);
  });
}

// start server
var server = app.listen(8000, function(){
	console.log('listening to port: 8000');
});
