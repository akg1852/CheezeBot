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
			
			// process message
			var query = "(?:(?:at\\s+(TIME)\\s+)|" + // 1: time
				"(?:in\\s+(DURATION)\\s+))?" + // 2: duration
				"(?:when(ever)?\\s+" + // 3: repeating
				"(\\S+)\\s+says\\s+" + // 4: user
				"(?:something|\"([^\"]+)\")\\s+)?" + // 5: condition
				"(?:then\\s+)?(?:do\\s+)?" +
				"([\\s\\S]+)"; // 6: command
			var match = context.content.match(new RegExp("^\\s*" + config.botName + "\\s+" + query, "i"));
			if (match) {
				var message = {
					flow: context.flow,
					user: (match[4] == "someone") ? undefined : match[4],
					time: 	match[3] ? undefined :
							match[2] ? utility.now() + " + " + match[2] : // todo: the real time calculations
							match[1],
					condition: (match[5] == "something") ? undefined : match[5],
					command: (match[6] == "nothing") ? undefined : match[6]
				}
				var reply;
				
				// check for matching command
				for (var i = 0; i < commands.length; i++) {
					var command = commands[i];
					var match = message.command.match(command.pattern);
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
