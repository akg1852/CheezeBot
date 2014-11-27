var config = require("./config.js");
var commands = require("./commands.js");
var utility = require("./utility.js");

var JSONStream = require('JSONStream');
var request = require('request');

var stream = {};
function run() {
	
	// check for connection
	if (stream.readable) {
		console.log("connected to flowdock stream");
		return;
	}
	console.log("connecting to flowdock stream");
	
	// connect to flowdock stream
	stream = request(encodeURI("https://" + config.flowdockToken + ":DUMMY@stream.flowdock.com/flows?filter=" + config.flows.join(",")))
	.pipe(JSONStream.parse());
	
	// listen for messages
	stream.on('data', function(context) {
		if (context.event == "message" && typeof context.content == "string") {
			
			// check if message is for bot
			var match = context.content.match(new RegExp("^\\s*" + config.botName + "\\s+([\\s\\S]+)", "i"));
			if (match) {
				var message = match[1];
				var reply;
				
				// check for matching command
				for (var i = 0; i < commands.length; i++) {
					var command = commands[i];
					var match = message.match(command.pattern);
					if (match) {
						
						// get reply from command
						reply = command.reply(match, context);
						break;
					}
				}
				// post reply to flowdock
				if (reply != null && reply != undefined) utility.post(reply, context);
			}
		}
	});
	
	// deal with stream failure
	stream.on('end', function() {
		console.log("flowdock stream ended");
		run();
	});
	stream.on('close', function() {
		console.log("flowdock stream closed");
		run();
	});
	stream.on('error', function(error) {
		console.error("flowdock stream error: " + JSON.stringify(error));
		run();
	});
	setTimeout(run, 2000);
}
run();
