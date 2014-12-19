var post = require("../flowdock.js").post;
var dbConnect = require("../utility.js").dbConnect;
var when = require("../when.js");
var commands = require("../commands.js");
var sandbox = new (require("sandbox"))();

module.exports = {
	description: "js {name}({params}) [\\n {code}]: create/run custom js code\n\t\t\t\t\t(also: 'js list' and 'js delete {name}')",
	pattern: /^js\s+(?:(list|delete\s+(\S+))|(?:(\S+)\s*\(([^\n\r]*)\)\s*(?:[\n\r]+([\s\S]+))?))$/i,
	reply: function(match, context) {
		dbConnect(function(db) {
			db.run("CREATE TABLE IF NOT EXISTS js" +
				"(name TEXT, params TEXT, code TEXT, PRIMARY KEY (name))", function(error) {
				if (error) {
					console.error("Error creating js table in database: " + JSON.stringify(error));
				}
				else if (match[2]) { // delete function
					var name = match[2];
					db.run("DELETE FROM js WHERE name = ?", name, function(error) {
						if (error) console.error("Error deleting js function '" + name + "': " + JSON.stringify(error));
						else if (this.changes) post("Deleted js function '" + name + "'.", context);
						else post("No js function '" + name + "', nothing deleted.", context);
					});
				}
				else if (match[1]) { // list functions
					db.all("SELECT * FROM js", function(error, rows) {
						if (error) console.error("Error retrieving js functions from db: " + JSON.stringify(error));
						else if (rows.length) {
							var result = ["List of all user-defined js functions:" + when.noTrigger];
							rows.forEach(function(r) {
								result.push(r.name + "(" + r.params + ")");
							});
							post(result.join("\n\t"), context);
						}
						else post("No js functions to display.", context);
					});
				}
				else if (match[5]) { // define function
					var name = match[3];
					var params = match[4];
					var code = match[5];
					db.run("INSERT OR REPLACE INTO js VALUES (?, ?, ?)", name, params, code, function(error) {
						if (error) console.error("Error updating js table: " + JSON.stringify(error));
						else post("Thanks for the new function.", context);
					});
				}
				else { // call function
					var name = match[3];
					var args = match[4];
					db.get("SELECT * FROM js WHERE name = ?", name, function(error, row) {
						if (error) console.error("Error reading js table: " + JSON.stringify(error));
						else if (row) {
							var commandFlag = "<EXECUTE_BOT_COMMAND>";
							sandbox.run("var context = " + JSON.stringify(context) + ", command = function(s) { print(\"" +
								commandFlag + "\" + s); }; (function(" + row.params + "){" + row.code + "})(" + args + ")",
								function(output) {
									if (output.console.length) {
										output.console.forEach(function(value) {
											if (String(value).indexOf(commandFlag) == 0) {
												commands.execute(value.slice(commandFlag.length).trim(), context);
											}
											else post(value, context);
										});
									}
									else post("[no output]", context);
								});
						}
						else post("There is no function with that name.", context);
					});
				}
			});
		});
	}
};
