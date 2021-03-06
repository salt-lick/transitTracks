//Getting all dependencies
var express = require('express.io');
var app = express();
var mongoose = require('mongoose');
//var postmark = require("postmark")(process.env.POSTMARK_API_KEY);

var http = require('http').Server(app)
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

var dtRouteLatExt = {max:34.74,min:34.7225};
var dtRouteLngExt = {max:-86.57433,min:-86.59767}

//Setup DB
mongoose.connect('mongodb://' + process.env.MONGO_USERNAME + ':' + process.env.MONGO_PASSWORD + '@ds053164.mongolab.com:53164/hsvtransit');

//Shuttle/trolly/auto DB setup
var transitSchema = new mongoose.Schema({
	id: Number,
	long: Number,
	lat: Number,
});
var Transit = mongoose.model('Transit', transitSchema);

var allLocations = [];

//Event DB structure
var eventSchema = new mongoose.Schema({
	id: Number,
	time: String,
	date: String,
	name: String,
	desciption: String,
	xcorr: Number,
	ycoor: Number
});
var Event = mongoose.model('Event', eventSchema);

//Statistics DB structure
var statsSchema = new mongoose.Schema({
  id: Number,
  hits: Number
});
var Stats = mongoose.model('Stats', statsSchema);

app.set('port', (process.env.PORT || 5000));

//Setting directory structure
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.use( bodyParser.urlencoded({extended: false }));
app.use( bodyParser.json());

//Setup socket.io
app.http().io();

app.get('/', function(req, res) {
	res.render('pages/index');
  Stats.find({id: 0}, function(err, stat) {
    if( stat[0] ) {
      stat[0].hits += 1;
      stat[0].save();
    }
  });
});

app.get('/test', function(req, res) {
    io.emit('location update', [34.73172, -86.58979]);
    res.send('Success');
});


app.get('/stats', function(req, res) {
  Stats.find({id: 0}, function(err, stat) {
    if( stat[0] ) {
      res.send('Hits: ' + stat[0].hits);
    } else {
      res.send('Error getting stats.');
    }
  });
});

//Adds account
app.post('/api/v1/account', function(req, res) {
	Transit.find({id: transitId}, function( err, transit ) {
		if( transit[0] ) {
			res.send('Account already created');
		} else {
			newTransit = new Transit( {id: transitId, lat: 0, long: 0} );
			newTransit.save();
			res.send('Account created');
		}
	});
});

//Updates account
app.post('/api/v1/account/:id', function(req, res) {
	res.send('Hello world!');
});

//Reads account
app.get('/api/v1/account/:id', function(req, res) {
	res.send('Hello world!');
});

//Adds location
app.post('/api/v1/trolly/:id/location', function(req, res) {
	var transitId = req.params.id;
	Transit.find({id: transitId}, function( err, transit ) {
		console.log('location for vehicle = ' + transitId);
		if( transit[0] ) {
			Transit.find({id: transitId}, function( err, transit ) {
				if( transit[0] ) {
					var ok = true;
					console.log('Recording location to DB: ' + transit[0].id);
					transit[0].id = req.params.id;
					if (transit[0].lat && 
					    transit[0].lat <= dtRouteLatExt.max && 
						transit[0].lat >= dtRouteLatExt.min) {
					    transit[0].lat = req.body.lat;
					} else { 
					   ok = false
					}
					if (transit[0].lon && 
					    transit[0].lon <= dtRouteLngExt.max && 
						transit[0].lon >= dtRouteLngExt.min) {
					    transit[0].long = req.body.lon;
					} else {
						ok = false;
					}
					if (ok) transit[0].save();
				} else {
					console.log('Invalid credentials in location update');
					res.send('Invalid credentials');
				}
			});
		} else {
			newTransit = new Transit( {id: transitId, long: req.body.lon, lat: req.body.lat} );
			newTransit.save();
			//console.log('New bus added');
		}
	});
	res.send('Location added');
});

//Reads location
app.get('/api/v1/trolly/:id/location', function(req, res) {
	res.send('Hello world!');
});

//Gets status of trollies
app.get('/api/v1/trollies', function(req, res) {
	res.send('Hello world!');
});

//Gets stops for a single trolley
app.get('/api/v1/trollies/:id/stops', function(req, res) {
	res.send('Hello world!');
});

var latLng = [];
var locations;
var latLongs = {};

var homeLatLng = [34.73689, -86.592192];

function findLocations() {
	//console.log('Updating current location');
	Transit.find({},{id:1,lat:1,long:1,_id:0}, function(err, transit) {
		//console.log("Getting coords for " + transit.length)
		if( transit.length > 0 ) {
			allLocations = transit;
		} else {
			console.log('DB credentials supplied incorrect');
		}
	});
}

var interval = setInterval(function(){findLocations();},3000);

//Everything socket.io related
io.sockets.on('connection', function(socket) {
	socket.on('get location', function( data ) {
		console.log('location update requested ');
    console.log(allLocations);
    if(allLocations[0].lat == 34.7368 && allLocations[0].long == -86.59192) {
      console.log('Sending dormant signal');
      io.emit('trolley off', []);
    } else {
      console.log('Sending coordinates');
		  io.emit('location update', allLocations);
    }
	});
    socket.on('disconnect', function() {
      console.log('User disconnected');
    });
});

/*************************************************
*Admin Functionality
*WARNING: Suspending development of section indefinitely
*************************************************/
/*
app.get('/admin', function(req, res) {
	var updates = [];
	res.render('pages/admin', {messages: updates});
});

app.get('/admin/addevent', function(req, res) {
	res.render('pages/eventadd');
});
*/

// Opening server to requests
http.listen(app.get('port'), function() {
	console.log('Node app is running on port ', app.get('port'));
	var d = new Date();
	console.log('Time: ', + d.getTime() + ', Day:' + d.getDay() + ', Hour:' + d.getHours());
});

//--- Test stuff ---------------------------------------

var testsend = require('sendNotification');
var to = "contact@hoparoundhuntsville.com"
var subject = "Message from user on Hop Around Huntsville"
var message = "This is a test message... hoparoundhuntsville on transittracks-dev has fired up"
var response = null;
testsend.send(to, subject, message, response);

//----------------------------------------------------------------------------------
