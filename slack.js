var config = require("./config.js");
var utility = require("./utility.js");
var request = require('request');
var WebSocket = require('ws');

var slack = module.exports = {};

// connect to slack real time messaging
slack.connect = function connect(onconnect, onmessage) {
	request(encodeURI('https://slack.com/api/rtm.start?token=' + config.slackToken), function(error, response, body) {
		utility.log("connecting to slack");
		
		if (!error && response.statusCode === 200) {
			slack.data = JSON.parse(body);
			slack.users = toAssoc('id', slack.data.users);
			slack.channels = toAssoc('id', slack.data.channels.concat(slack.data.groups, slack.data.ims));

			slack.socket = new WebSocket(slack.data.url);
			
			slack.socket.onopen = function() {
				utility.log('connected to slack');
				onconnect();
			};

			slack.socket.onmessage = onmessage;

			slack.socket.onclose = function() {
				utility.log("slack socket closed");
				setTimeout(connect, 2000);
			};
			
			slack.socket.onerror = function(error) {
				utility.log("slack socket error: " + JSON.stringify(error));
				setTimeout(connect, 2000);
			};
		}
		else {
			utility.log("slack authentication error");
			setTimeout(connect, 2000);
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
	utility.log("(in " + (channel.name || "<private message>")  + ")\n" +
		context.user.real_name + ": " + context.text + "\n" +
		config.botName + ": " + reply);
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

// generate associative array from array of objects
function toAssoc(keyName, arr) {
	var result = {};
	for (var i = 0; i < arr.length; i++) {
		var item = arr[i];
		result[item[keyName]] = item;
	}
	return result;
}
