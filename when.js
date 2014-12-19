var config = require("./config.js");
var utility = require("./utility.js");
var dbConnect = utility.dbConnect;
var flowdock = require("./flowdock.js");
var post = flowdock.post;

var loadedDelayed = false;
var times = {};

var when = module.exports = {
	
	matchQuery: function(query) {
		var pattern = "(?:(?:at\\s+(\\d\\d?:\\d\\d)\\s+)|" + // 1: time
			"(?:in\\s+([\\d.]+\\s*(?:second(?:s?)|minute(?:s?)|hour(?:s?)|day(?:s?)))\\s+))?" + // 2: duration
			"(?:when(ever)?\\s+" + // 3: repeating
			"(\\S+)\\s+says\\s+" + // 4: user
			"(?:something|[\"“]([^\"”]+)[\"”])\\s+)?" + // 5: condition
			"(?:then\\s+)?(?:do\\s+)?" +
			"([\\s\\S]+)"; // 6: command
		var match = query.match(new RegExp("^\\s*" + config.botName + "\\s+" + pattern, "i"));
		if (match) return {
			user: (match[4] == "someone") ? undefined : match[4],
			time: match[3] ? undefined
				: match[2] ? utility.parseDuration(match[2]).getTime()
				: match[1] ? utility.parseTime(match[1]).getTime()
				: (new Date()).getTime(),
			condition: (match[4] && !match[5]) ? "" : match[5],
			command: (match[6] == "nothing") ? undefined : match[6]
		};
	},
	
	createDB: function(callback) {
		var whenColumns = "id INTEGER PRIMARY KEY, flow TEXT, time INTEGER, user TEXT, condition TEXT, command TEXT";
		dbConnect(function(db) { db.run("CREATE TABLE IF NOT EXISTS 'when' (" + whenColumns + ")", function(error) {
			if (error) {
				console.error("Error creating 'when' table in database: " + JSON.stringify(error));
			}
			else {
				callback();
			}
		})});
	},
	
	add: function(query, context, callback) {
		dbConnect(function(db) {
			db.run("INSERT INTO 'when' VALUES (?, ?, ?, ?, ?, ?)",
				null, context.flow, query.time, query.user, query.condition, query.command, function(error) {
				if (error) console.error("Error adding 'when' rules: " + JSON.stringify(error));
				else {
					post("Thanks for the new 'when' rule!", context);
					if (callback) callback(this.lastID);
				}
			});
		});
	},
	
	deleteByQuery: function(query, context) {
		dbConnect(function(db) {
			db.run("DELETE FROM 'when' WHERE " +
				"flow = $flow AND " +
				"((time IS NULL AND $time IS NULL) OR (time = $time) OR " +
					"(condition IS NOT NULL AND time <= $currentTime AND $time <= $currentTime)) AND " +
				"((condition IS NULL AND $condition IS NULL) OR condition LIKE $condition) AND " +
				"((user IS NULL AND $user IS NULL) OR user LIKE $user)", {
				$flow: context.flow, $time: query.time, $condition: query.condition,
				$user: query.user, $currentTime: (new Date()).getTime() }, function(error) {
					if (error) console.error("Error deleting 'when' rules: " + JSON.stringify(error));
					else if (this.changes) {
						post(this.changes + " 'when' rule" + (this.changes > 1 ? "s" : "") + " deleted", context);
					}
					else console.log("no 'when' rules matching query, nothing deleted");
				}
			);
			// todo: allow delete when both row.time and query.time are prior to current time
		});
	},
	
	deleteByID: function(id) {
		dbConnect(function(db) {
			db.run("DELETE FROM 'when' WHERE id = ?", id, function(error) {
				if (error) console.error("Error deleting 'when' rule " + id + ": " + JSON.stringify(error));
				else if (this.changes) console.log("deleted 'when' rule");
				else console.log("no 'when' rule " + id + ", nothing deleted");
			});
		});
	},
	
	getDelayed: function(callback) {
		if (loadedDelayed) return;
		
		dbConnect(function(db) {
			db.all("SELECT * FROM 'when' WHERE time IS NOT NULL AND condition IS NULL", function(error, rows) {
				if (error) console.error("Error retrieving delayed 'when' rules: " + JSON.stringify(error));
				else if (rows.length) {
					rows.forEach(callback);
					loadedDelayed = true;
				}
			});
		})
	},
	
	trigger: function(context, callback) {
		flowdock.getUserInfo(context, function(user) { dbConnect(function(db) {
			if (context.content.match(new RegExp(when.noTrigger, "i"))) return;
			db.all("SELECT * FROM 'when' WHERE " +
				"flow = ? AND (time IS NULL OR time <= ?) AND (? LIKE ('%' || condition || '%')) AND (user IS NULL OR user LIKE ?)",
				context.flow, (new Date()).getTime(), context.content, user.nick, function(error, rows) {
				if (error) console.error("Error retrieving 'when' rules for trigger: " + JSON.stringify(error));
				else if (rows.length) {
					rows.forEach(function(r) {
						var now = (new Date()).getTime();
						if (!times[r.id] || (now - times[r.id] > config.wheneverRefactorySeconds * 1000)) {
							callback(r);
							if (r.time) when.deleteByID(r.id);
							else times[r.id] = now;
						}
					});
				}
			});
		})});
	},
	noTrigger: String.fromCharCode(8203),
	
	list: function(context) {
		dbConnect(function(db) {
			var day = 24 * 60 * 60 * 1000;
			db.all("SELECT * FROM 'when' where flow = ? AND (time IS NULL OR (time - ?) < ?)",
				context.flow, (new Date()).getTime(), day, function(error, rows) {
				if (error) console.error("Error retrieving 'when' rules for list: " + JSON.stringify(error));
				else if (rows.length) {
					var result = ["List of all today's 'when' rules in the flow:" + when.noTrigger];
					rows.forEach(function(r) {
						result.push(
							((r.time && r.time > (new Date()).getTime()) ? "at " + utility.formatTime(r.time) + " " : "") +
							((r.condition != null) ? "when" + (r.time ? " " : "ever ") + (r.user || "someone") +
								" says " + (r.condition ? "\"" + r.condition + "\" " : "something ") : "") +
							"then " + r.command
						);
					});
					post(result.join("\n\t"), context);
				}
				else post("No 'when' rules to display", context);
			});
		});
	},
	
	help: {
		description: "when {condition} do {command}:\tconditional command (see: 'when help')",
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
						"'when list' lists all the current when rules",
						"'whenever' rules have a " + 
							((s >= 60) ? (Number((s/60).toFixed(1)) + " minute") : (s + " second")) + " refactory period"
					].join("\n");
				case "list": when.list(context);
			}
		}
	}
};
