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
			description: "help:\t\t\t\t\t\t\t\tdisplay this message",
			pattern: /^help/i,
			reply: function(match, context, callback) {
				var s = config.botName + " commands:\n```";
				for (var i = 0; i < commands.length; i++) {
					var command = commands[i];
					if (command.description) s += "\n" + command.description;
				}
                s += "\n```";
				post(s, context, callback);
			}
		});
		
		// add commands from 'commands' folder to 'commands' array
		commands = commands.concat(files
			.map(function(f) {
				return require("./commands/" + f);
			})
			.sort(function(a, b) {
				return (b.priority || 0) - (a.priority || 0);
			})
		);
		
		// 'when help' and 'when list' messages
		commands.push(when.help);

		// 'about' message
		commands.push({
			description: "about:\t\t\t\t\t\t\t\tabout " + config.botName,
			pattern: /^about/i,
			reply: function(match, context, callback) {
				post(config.about, context, callback);
			}
		});
		
		// 'say' command
		commands.push({
			description: null,
			pattern: /^(?:say|echo)\s+([\s\S]+)/i,
			reply: function(match, context, callback) {
				post(match[1], context, callback);
			}
		});
	}
})

// execute command
commands.execute = function(command, context, callback) {
	for (var i = 0; i < commands.length; i++) {
		var c = commands[i];
		var match = command.match(c.pattern);
		if (match) {
			c.reply(match, context, callback);
			break;
		}
	}
};
