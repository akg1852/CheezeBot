var config = require("./config.js");
var request = require('request');
var WebSocket = require('ws');

var slack = module.exports = {};

// connect to slack real time messaging
slack.connect = function connect(onconnect, onmessage) {
	request(encodeURI('https://slack.com/api/rtm.start?token=' + config.slackToken), function(error, response, body) {
		console.log("connecting to slack");
		
		if (!error && response.statusCode === 200) {
			slack.data = JSON.parse(body);
			slack.users = toAssoc('id', slack.data.users);
			slack.channels = toAssoc('id', slack.data.channels.concat(slack.data.groups, slack.data.ims));

			slack.socket = new WebSocket(slack.data.url);
			
			slack.socket.onopen = function() {
				console.log('connected to slack');
				onconnect();
			};

			slack.socket.onmessage = onmessage;

			slack.socket.onclose = function() {
				console.log("slack socket closed");
				setTimeout(connect, 2000);
			};
			
			slack.socket.onerror = function(error) {
				console.error("slack socket error: " + JSON.stringify(error));
				setTimeout(connect, 2000);
			};
		}
		else {
			console.log("slack authentication error");
		}
	});
}

// post reply
slack.post = function post(reply, context, callback){
	slack.socket.send(JSON.stringify({
		type: 'message',
		channel: context.channel,
		thread_ts: context.thread_ts || context.ts,
		text: String(reply) || "[no reply]"
	}));
	
	var channel = slack.channels[context.channel];

	console.log("\n---" + (channel.name || "<private message>")  + "--- (" + now() + ")\n" + context.user.real_name + ": " + context.text);
	console.log(config.botName + ": " + reply + "\n");
	if (callback) callback();
}

// find id of user based on a provided string
slack.findUser = function(userString) {
	var user = slack.data.users.find(function(user) {
		return  userString == user.name ||
				userString == user.real_name ||
				userString == user.profile.real_name ||
				userString == user.profile.email;
	});
	return user === undefined ? undefined : user.id;
}

slack.decodeControlChars = function(s) {
	return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// current date and time string
function now() {
	var d = new Date();
	return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate() + " " +
		d.getHours() + ":" + d.getMinutes();
}

// generate associative array from array of objects
function toAssoc(keyName, arr) {
	var result = {};
	for (var i = 0; i < arr.length; i++) {
		var item = arr[i];
		result[item[keyName]] = item;
	}
	return result;
}
