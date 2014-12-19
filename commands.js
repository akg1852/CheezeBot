var config = require("./config.js");
var post = require("./flowdock.js").post;
var when = require("./when.js");
var fs = require('fs');

var commands = module.exports = [];
fs.readdir("commands", function(error, files) {
	if (error) console.error("Error listing command files: " + JSON.stringify(error) + "\n");
	else {
		
		// 'help' message
		commands.push({
			description: "help:\t\t\t\tdisplay this message",
			pattern: /^help/i,
			reply: function() {
				var s = config.botName + " commands:";
				for (var i = 0; i < commands.length; i++) {
					var command = commands[i];
					if (command.description) s += "\n\t" + command.description;
				}
				return s;
			}
		});
		
		// add commands from 'commands' folder to 'commands' array
		for (var i = 0; i < files.length; i++) {
			commands.push(require("./commands/" + files[i]));
		}
		
		// 'when help' and 'when list' messages
		commands.push(when.help);

		// 'about' message
		commands.push({
			description: "about:\t\t\t\tabout " + config.botName,
			pattern: /^about/i,
			reply: function() {
				return config.about;
			}
		});
		
		// 'say' command
		commands.push({
			description: null,
			pattern: /^(?:say|echo)\s+([\s\S]+)/i,
			reply: function(match) {
				return match[1];
			}
		});
	}
})

// execute command
commands.execute = function(command, context, callback) {
	var reply;
	for (var i = 0; i < commands.length; i++) {
		var c = commands[i];
		var match = command.match(c.pattern);
		if (match) {
			reply = c.reply(match, context);
			break;
		}
	}
	if (reply != null && reply != undefined) post(reply, context, callback);
	else if (callback) callback();
};
