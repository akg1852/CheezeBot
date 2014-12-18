var post = require("../flowdock.js").post;
var dbConnect = require("../utility.js").dbConnect;
var sandbox = new (require("sandbox"))();

module.exports = {
	description: "js {name}({params}) [\\n {code}]: create/run custom js code",
	pattern: /^js\s+(\S+)\s*\(([^\n\r]*)\)\s*(?:[\n\r]+([\s\S]+))?$/i, // todo: make sure params is comma separated list
	reply: function(match, context) {
		dbConnect(function(db) {
			db.run("CREATE TABLE IF NOT EXISTS js" +
				"(name TEXT, params TEXT, code TEXT, PRIMARY KEY (name))", function(error) {
				if (error) {
					console.error("Error creating js table in database: " + JSON.stringify(error));
				}
				else {
					var name = match[1];
					if (match[3]) { // define function
						var params = match[2];
						var code = match[3];
						db.run("INSERT OR REPLACE INTO js VALUES (?, ?, ?)", name, params, code, function(error) {
							if (error) console.error("Error updating js table: " + JSON.stringify(error));
							else post("Thanks for the new function.", context);
						});
					}
					else { // call function
						var args = match[2];
						db.get("SELECT * FROM js WHERE name = ?", name, function(error, row) {
							if (error) console.error("Error reading js table: " + JSON.stringify(error));
							else if (row) {
								sandbox.run("(function(" + row.params + "){" + row.code + "})(" + args + ")", function(output) {
									post(output.console.length ? output.console.join("\n") : "[no output]", context);
								});
							}
							else post("There is no function with that name.", context);
						});
					}
				}
			});
		});
	}
};
