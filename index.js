var config = require("./config.js");
var commands = require("./commands.js");
var utility = require("./utility.js");

var JSONStream = require('JSONStream');
var request = require('request');

var stream = request(encodeURI("https://" + config.flowdockToken + ":DUMMY@stream.flowdock.com/flows?filter=" + config.flows.join(",")))
	.pipe(JSONStream.parse());

stream.on('data', function(context) {
	if (context.event == "message" && typeof context.content == "string") {
		
		// check if message is for bot
		var match = context.content.match(new RegExp("^\\s*" + config.botName + "\\s+([\\s\\S]+)", "i"));
		if (match) {
			var message = match[1];
			
			// post reply
			var reply;
			for (var i = 0; i < commands.length; i++) {
				var command = commands[i];
				var match = message.match(command.pattern);
				if (match) {
					reply = command.reply(match, context);
					break;
				}
			}
			if (reply != null && reply != undefined) utility.post(reply, context);
		}
	}
});
stream.on('end', function() {
	console.error("flowdock stream ended");
	console.log(JSON.stringify(stream));
	// todo: handle stream end more gracefully
});
stream.on('close', function() {
	console.error("flowdock stream closed");
	console.log(JSON.stringify(stream));
	// todo: handle stream close more gracefully
});
stream.on('error', function(error) {
	console.error("Error receiving stream data from flowdock: " + JSON.stringify(error) + "\n");
	console.log(JSON.stringify(stream));
	// todo: handle stream error more gracefully
});
