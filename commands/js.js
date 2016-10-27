var config = require("../config.js");
var post = require("../flowdock.js").post;
var dbConnect = require("../utility.js").dbConnect;
var commands = require("../commands.js");
var sandbox = new (require("sandbox"))();

var shortcircuit = false;

module.exports = {
	synopsis: "js {name}({params}) [\\n {code}]",
	description: "create/run custom js code (see: 'js help')",
	pattern: /^js(?:\s+(?:(help)|(list)|(shortcircuit)|(delete)))?(?:[^\S\n\t]+([A-Z_$][0-9A-Z_$]*))?(?:[^\S\n\r]*\(([^\n\r]*)\))?(?:[\n\r]+([\s\S]+))?$/i,
	priority: -10,
	reply: function(match, context, callback) {
		var name = match[5], params = match[6], code = match[7];
		dbConnect(function(db) {
			db.run("CREATE TABLE IF NOT EXISTS js" +
				"(name TEXT, params TEXT, code TEXT, deleted INTEGER)", function(error) {
				
				function deleteFunction(name, callback) {
					db.run("UPDATE js SET deleted = 1 WHERE deleted = 0 AND name = ?", name, function(error) {
						if (error) {
							console.error("Error deleting js function '" + name + "': " + JSON.stringify(error));
						}
						else callback.call(this);
					});
				}
				
				if (error) {
					console.error("Error creating js table in database: " + JSON.stringify(error));
				}
				else if (match[1]) { // help
					post(["User-defined javascript functions!\n",
						"Run some code:",
						"```\njs \\n {code}\n```",
						"Define a function:",
						"```\njs {name}({param, param, ...}) \\n {code}\n```",
						"Call a function:",
						"```\njs {name}({arg, arg, ...})\n```",
						"Delete a function:",
						"```\njs delete {name}\n```",
						"List all functions:",
						"```\njs list\n```",
						"Print a function's code:",
						"```\njs {name}\n```",
						"Stop a spammy function in it's tracks:",
						"```\njs shortcircuit\n```",
						"Inside the {code} block of a function definition, access is provided to the following:",
						"```\nfunction post(\"{message text}\") {\n\t/* post a message */\n}\n",
						"function command(\"{command text}\") {\n\t/* call a " + config.botName + " command */\n}\n",
						"var context = {\n\t\t/* the flowdock context of the function call */\n}\n```",
					].join("\n"), context, callback);
				}
				if (match[2]) { // list functions
					db.all("SELECT * FROM js WHERE deleted = 0", function(error, rows) {
						if (error) {
							console.error("Error retrieving js functions from db: " + JSON.stringify(error));
						}
						else if (rows.length) {
							var result = ["List of all user-defined js functions:"];
							rows.forEach(function(r) {
								result.push(r.name + "(" + r.params + ")");
							});
							post(result.join("\n* "), context, callback);
						}
						else post("No js functions to display.", context, callback);
					});
				}
				else if (match[3]) { // shortcircuit function
					shortcircuit = true;
				}
				else if (match[4] && name) { // delete function
					deleteFunction(name, function() {
						if (this.changes) post("Deleted js function '" + name + "'.", context, callback);
						else post("No js function '" + name + "', nothing deleted.", context, callback);
					});
				}
				else if (name && code) { // define function
					deleteFunction(name, function() {
						db.run("INSERT INTO js VALUES (?, ?, ?, 0)", name, params || "", code, function(error) {
							if (error) {
								console.error("Error updating js table: " + JSON.stringify(error));
							}
							else post("Thanks for the new function.", context, callback);
						});
					});
				}
				else if (code) { // call code (without defining function)
					callFunction("", "", code, context, callback);
				}
				else if (name) { // call (or print) function
					db.get("SELECT * FROM js WHERE deleted = 0 AND name = ?", name, function(error, row) {
						if (error) {
							console.error("Error reading js table: " + JSON.stringify(error));
						}
						else if (row) {
							if (typeof params == "string") callFunction(row.params, params, row.code, context, callback); // call
							else post("Definition for js function " + name + "(" + row.params + ")\n```\n" + row.code + "\n```", context, callback); // print
						}
						else post("There is no js function '" + name + "'.", context, callback);
					});
				}
			});
		});
	}
};

function callFunction(params, args, code, context, callback) {
	var commandFlag = "<EXECUTE_BOT_COMMAND>";
	sandbox.run("var post = print, context = " + JSON.stringify(context) +
		", command = function(s) { print(\"" + commandFlag + "\" + s); }; (function(" +
		params + "){" + code + "})(" + args + ")",
		function(output) {
			var l = output.console.length, i = 0;
			if (l) {
				var jsOut = function() {
					if (i < l) {
						var value = output.console[i++];
						if (shortcircuit) {
							shortcircuit = false;
							post("Shortcircuited js function '" + name + "'.", context);
						}
						else {
							if (String(value).indexOf(commandFlag) == 0) {
								commands.execute(value.slice(commandFlag.length).trim(), context, jsOut);
							}
							else post(value, context, jsOut);
						}
					}
					else if (callback) callback();
				};
				jsOut();
			}
			else if (callback) callback();
		});
}
