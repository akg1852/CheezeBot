var config = require("../config.js");
var post = require("../flowdock.js").post;
var dbConnect = require("../utility.js").dbConnect;
var when = require("../when.js");
var commands = require("../commands.js");
var sandbox = new (require("sandbox"))();

var shortcircuit = false;

module.exports = {
	description: "js {name}({params}) [\\n {code}]: create/run custom js code\n\t\t\t\t\t(see: 'js help')",
	pattern: /^js\s+(?:(help|list|shortcircuit|delete\s+(\S+))|(?:(\S+)\s*\(([^\n\r]*)\)\s*(?:[\n\r]+([\s\S]+))?))$/i,
	priority: -10,
	reply: function(match, context, callback) {
		dbConnect(function(db) {
			db.run("CREATE TABLE IF NOT EXISTS js" +
				"(name TEXT, params TEXT, code TEXT, PRIMARY KEY (name))", function(error) {
				if (error) {
					console.error("Error creating js table in database: " + JSON.stringify(error));
				}
				else if (match[2]) { // delete function
					var name = match[2];
					db.run("DELETE FROM js WHERE name = ?", name, function(error) {
						if (error) {
							console.error("Error deleting js function '" + name + "': " + JSON.stringify(error));
						}
						else if (this.changes) post("Deleted js function '" + name + "'.", context, callback);
						else post("No js function '" + name + "', nothing deleted.", context, callback);
					});
				}
				else if (match[1]) {
					if (match[1] == "list") { // list functions
						db.all("SELECT * FROM js", function(error, rows) {
							if (error) {
								console.error("Error retrieving js functions from db: " + JSON.stringify(error));
							}
							else if (rows.length) {
								var result = ["List of all user-defined js functions:" + when.noTrigger];
								rows.forEach(function(r) {
									result.push(r.name + "(" + r.params + ")");
								});
								post(result.join("\n\t"), context, callback);
							}
							else post("No js functions to display.", context, callback);
						});
					}
					else if (match[1] == "shortcircuit") {
						shortcircuit = true;
					}
					else { // help
						post(["User-defined javascript functions!\n",
							"Define a function:",
							"\tjs {name}({param, param, ...}) \\n {code}",
							"Call a function:",
							"\tjs {name}({arg, arg, ...})",
							"Delete a function:",
							"\tjs delete {name}",
							"List all functions:",
							"\tjs list",
							"Stop a spammy function in it's tracks:",
							"\tjs shortcircuit",
							"Inside the {code} block of a function definition, access is provided to the following:",
							"\tfunction post(\"{message text}\") {\n\t\t/* post a message */\n\t}",
							"\tfunction command(\"{command text}\") {\n\t\t/* call a " + config.botName + " command */\n\t}",
							"\tvar context = {\n\t\t/* the flowdock context of the function call */\n\t};",
						].join("\n"), context, callback);
					}
				}
				else if (match[5]) { // define function
					var name = match[3];
					var params = match[4];
					var code = match[5];
					db.run("INSERT OR REPLACE INTO js VALUES (?, ?, ?)", name, params, code, function(error) {
						if (error) {
							console.error("Error updating js table: " + JSON.stringify(error));
						}
						else post("Thanks for the new function.", context, callback);
					});
				}
				else { // call function
					var name = match[3];
					var args = match[4];
					db.get("SELECT * FROM js WHERE name = ?", name, function(error, row) {
						if (error) {
							console.error("Error reading js table: " + JSON.stringify(error));
						}
						else if (row) {
							var commandFlag = "<EXECUTE_BOT_COMMAND>";
							sandbox.run("var post = print, context = " + JSON.stringify(context) +
								", command = function(s) { print(\"" + commandFlag + "\" + s); }; (function(" +
								row.params + "){" + row.code + "})(" + args + ")",
								function(output) {
									var l = output.console.length, i = 0;;
									if (l) {
										var jsOut = function() {
											if (i < l) {
												var value = output.console[i++];
												if (shortcircuit) {
													shortcircuit = false;
													post("Shortcircuited js function.", context);
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
									else post("[no output]", context, callback);
								});
						}
						else post("There is no function with that name.", context, callback);
					});
				}
			});
		});
	}
};
