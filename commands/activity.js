var utility = require("../utility.js");
var post = require("../slack.js").post;

var suggestionsPerDay = 2;
var dayStartHour = 9;
var dayEndHour = 17;

var activities = [
	'stretch your legs',
	'have a coffee with a colleague',
	'do 10 squats',
	'have a snack',
	'go outside',
	'do 20 pushups',
	'send a thank-you message',
	'close your eyes and take 10 deep breaths',
	'change your passwords',
	'blast some music',
	'hold a plank for 30 seconds',
	'complete an item on your todo list',
	'catch up on your emails',
	'eat a piece of fruit',
	'sign up for a course',
	'go for a walk',
	'read a book/magazine/newspaper',
	'do nothing for a few minutes',
	'drink a glass of water',
	'pick a new desktop background',
	'have a stretch',
	'declutter your desk',
	'have a nap',
	'write something',
	'make a playlist',
	'grab some new office supplies',
	'challenge a colleague to a chair race'
];

module.exports = {
	synopsis: "activity [[un]subscribe]",
	description: "activity suggester",
	pattern: /^activity(?:\s+((?:un)?subscribe))?/i,
	reply: function(match, context, callback) {
		var action = (match[1] || '').toLowerCase();
		dbConnect(function(db) {
			if (action === 'subscribe') {
				update(context.channel, function() {
					post("Thanks for subscribing to activity suggestions!", context, callback);
				});
			}
			else if (action === 'unsubscribe') {
				db.run("DELETE FROM activity WHERE channel LIKE ?", context.channel, function(error) {
					if (error) {
						utility.log("Error removing activity subscription: " + JSON.stringify(error));
					}
					else post("Thanks for unsubscribing from activity suggestions!", context, callback);
				});
			}
			else {
				suggest(context, callback);
			}
		});
	}
};

var periodLength = (dayEndHour - dayStartHour) / (suggestionsPerDay + 1);
setInterval(function(){
	var now = new Date();
	var nowDay = now.getDay();
	var nowHour = now.getHours() + (now.getMinutes() / 60);
	if (nowDay != 0 && nowDay != 6 && nowHour >= dayStartHour + periodLength && nowHour < dayEndHour) {
		subscribedChannels(function(row){
			var last = new Date(row.time * 1000);
			var hoursElapsed = (now - last) / 1000 / 60 / 60;
			if (hoursElapsed >= periodLength) {
				update(row.channel, function() {
					suggest(row.channel);
				});
			}
		});
	}
}, 10 * 60 * 1000);

function suggest(context, callback) {
	var message = 'Might I suggest you take a quick break and ' + utility.random(activities);
	post(message, context, callback);
}

function subscribedChannels(callback) {
	dbConnect(function(db) {
		db.all("SELECT * FROM activity", function(error, rows) {
			if (error) {
				utility.log("Error reading activity subscription: " + JSON.stringify(error));
			}
			else {
				rows.forEach(callback);
			}
		});
	});
}

function update(channel, callback) {
	utility.dbConnect(function(db){
		db.run("INSERT OR REPLACE INTO activity VALUES (?, ?)", channel, unixTime(), function(error) {
			if (error) {
				utility.log("Error writing activity subscription: " + JSON.stringify(error));
			}
			else {
				callback();
			}
		});
	});
}

function dbConnect(callback) {
	utility.dbConnect(function(db) {
		db.run("CREATE TABLE IF NOT EXISTS activity (channel TEXT NOT NULL PRIMARY KEY, time INTEGER NOT NULL)", function(error) {
			if (error) {
				utility.log("Error creating activity table in database: " + JSON.stringify(error));
			}
			else {
				callback(db);
			}
		});
	});
}

function unixTime() {
	return Math.round((new Date()).getTime() / 1000);
}