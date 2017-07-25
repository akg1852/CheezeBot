var utility = require("../utility.js");
var post = require("../slack.js").post;

module.exports = {
	synopsis: "tally {category} [{member}[++|--]]",
	description: "keep a tally (see: 'tally help')",
	pattern: /^tally\s+(pivot\s+)?(?:(help)|(list)|(?:(\S+)(?:\s+([^\s+-]*)\s*(\+\+|--|\+=\s*\d+|-=\s*\d+)?)?))\s*/i,
	reply: function(m, context, callback) {
		match = { pivot: !!m[1], help: !!m[2], list: !!m[3], command: m[6] };
		match.category = match.pivot ? m[5] : m[4];
		match.member = match.pivot ? m[4] : m[5];
		match.item = match.pivot ? "member" : "category";
		
		utility.dbConnect(function(db) {
			db.run("CREATE TABLE IF NOT EXISTS tally" +
				"(category TEXT, member TEXT, count INT, PRIMARY KEY (category, member))", function(error) {
				if (error) utility.log("Error creating tally table in database: " + JSON.stringify(error));
				else if (match.help) {
					post(["Tally command:",
						"`tally {category} [{member} [++|--|+= n|-= n]]`",
						"'tally list' lists all categories",
						"'tally pivot ...' swaps categories and members",
					].join("\n"),
					context, callback);
				}
				else if (match.list) {
					db.all("SELECT " + match.item + " FROM tally GROUP BY " + match.item, function(error, rows) {
						if (error) utility.log("Error reading tally list: " + JSON.stringify(error));
						else if (rows.length) {
							var result = ["Tally " + match.item + " list:"].concat(rows.map(function(r) { return r[match.item] })).join("\n* ");
							post(result, context, callback);
						}
						else post("No " + match.item + " to list.", context, callback);
					});
				}
				else {
					db.all("SELECT * FROM tally WHERE category LIKE ? AND member LIKE ?", match.category || "%", match.member || "%", function(error, rows) {
						var postTally = function(rows) {
							var result = "";
							for (var i = 0; i < rows.length; i++) {
								result += "\n* " + (match.pivot ? rows[i].category : rows[i].member) + ": " + rows[i].count;
							}
							post("Tally for " + match.item + " '" + match[match.item] + "':" + result, context, callback);
						};
						
						if (error) utility.log("Error reading tally: " + JSON.stringify(error));
						else if (match.command) {
							var count = rows.length ? rows[0].count : 0;
							eval("count" + match.command);
							db.run("DELETE FROM tally WHERE category LIKE ? AND member LIKE ?", match.category, match.member, function(error) {
								if (error) utility.log("Error deleting tally: " + JSON.stringify(error));
								else if (count) {
									db.run("INSERT INTO tally VALUES (?, ?, ?)", match.category, match.member, count, function(error) {
										if (error) {
											utility.log("Error updating tally: " + JSON.stringify(error));
										}
										else postTally([{category: match.category, member: match.member, count: count}]);
									});
								}
								else postTally([{category: match.category, member: match.member, count: count}]);
							});
						}
						else postTally(rows);
					});
				}
			});
		});
	}
};
