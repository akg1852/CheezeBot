var dbConnect = require("../utility.js").dbConnect;
var post = require("../slack.js").post;

module.exports = {
	synopsis: "quote [\"{quote}\" - {quotee}]",
	description: "quote store",
	pattern: /^quote(?:\s+(.+))?/i,
	reply: function(match, context, callback) {
		dbConnect(function(db) {
			db.run("CREATE TABLE IF NOT EXISTS quote (quote TEXT)", function(error) {
				if (error) {
					console.error("Error creating quote table in database: " + JSON.stringify(error));
				}
				else if (typeof match[1] == "string") {
					var quote = match[1].trim();
					if (quote.match(/["“].+["”] - .+/)) {
						db.run("INSERT INTO quote VALUES (?)", quote, function(error) {
							if (error) {
								console.error("Error writing quote: " + JSON.stringify(error));
							}
							else post("Thanks for the new quote!", context, callback);
						});
					}
					else post("No! Badly formatted quote!", context, callback);
				}
				else {
					db.all("SELECT * FROM quote", function(error, rows) {
						if (error) {
							console.error("Error reading quote: " + JSON.stringify(error));
						}
						else if (!rows.length) post("No quotes available.", context, callback);
						else post(rows[Math.floor(Math.random() * rows.length)].quote, context, callback);
					});
				}
			});
		});
	}
};
