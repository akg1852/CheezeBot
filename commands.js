var config = require("./config.js");
var post = require("./slack.js").post;
var when = require("./when.js");
var utility = require("./utility.js");
var fs = require('fs');

var commands = module.exports = [];
fs.readdir("commands", function(error, files) {
	if (error) utility.log("Error listing command files: " + JSON.stringify(error) + "\n");
	else {
		
		// 'help' message
		commands.push({
			synopsis: "help",
			description: "display this message",
			pattern: /^help/i,
			reply: function(match, context, callback) {
				var synopsisWidth = Math.max.apply(Math, commands.map(function(c) { return (c.synopsis || "").length; }));
				var s = config.botName + " commands:\n```";
				for (var i = 0; i < commands.length; i++) {
					var command = commands[i];
					if (command.synopsis && command.description)
						s += "\n" + command.synopsis + "\n\t" + command.description;
				}
				s += "\n```";
				post(s, context, callback);
			}
		});
		
		// add commands from 'commands' folder to 'commands' array
		commands = commands.concat(files
			.filter(function(f) {
				return f.endsWith(".js");
			})
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
			synopsis: "about",
			description: "about " + config.botName,
			pattern: /^about/i,
			reply: function(match, context, callback) {
				post(config.about, context, callback);
			}
		});
		
		// 'say' command
		commands.push({
			pattern: /^(?:say|echo)\s+([\s\S]+)/i,
			reply: function(match, context, callback) {
				var s = match[1].split(/["“”]/i);
				s = (s.length == 3 && !s[0] && !s[2]) ? s[1] : match[1];
				post(s, context, callback);
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
			return true;
		}
	}
	return false;
};
