var config = require("./config.js");
var request = require('request');
var WebSocket = require('ws');

var slack = module.exports = {};

// connect to slack real time messaging
slack.connect = function connect(onmessage) {
	request(encodeURI('https://slack.com/api/rtm.start?token=' + config.slackToken), function(error, response, body) {
		console.log("connecting to slack");
		
		if (!error && response.statusCode === 200) {
			slack.data = JSON.parse(body);
			slack.socket = new WebSocket(slack.data.url);
			
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
	
	var channel = slack.data.channels.concat(slack.data.groups).find(function(c) { return c.id === context.channel; });
	var user = slack.data.users.find(function(u) { return u.id === context.user; });
	
	console.log("\n---" + channel.name + "--- (" + now() + ")\n" + user.real_name + ": " + context.text);
	console.log(config.botName + ": " + reply + "\n");
	if (callback) callback();
}

// current date and time string
function now() {
	var d = new Date();
	return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate() + " " +
		d.getHours() + ":" + d.getMinutes();
}
