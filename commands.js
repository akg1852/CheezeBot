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
		commands.push({
			description: "when {condition} do {command}:\tconditional command\n\t\t\t\t\t(see: 'when help' and 'when list')",
			pattern: /^when (help|list)/i,
			reply: function(match, context) {
				switch (match[1]) {
					case "help":
						var s = config.wheneverRefactorySeconds;
						return [
							"Conditional commands. Full semantics are as follows:",
							"\t[at {time} | in {duration}]",
							"\t[when[ever] ({user} | someone) says (\"{string}\" | something)]",
							"\t[then] ([do] ({command} | noCheezeBot2thing) | say {message})",
							"note: 'whenever' rules have a " + 
								((s >= 60) ? (Number((s/60).toFixed(1)) + " minute") : (s + " second")) + " refactory period"
						].join("\n");
					case "list": when.list(context);
				}
			}
		});

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
commands.execute = function(command, context) {
	var reply;
	for (var i = 0; i < commands.length; i++) {
		var c = commands[i];
		var match = command.match(c.pattern);
		if (match) {
			reply = c.reply(match, context);
			break;
		}
	}
	if (reply != null && reply != undefined) post(reply, context);
};
