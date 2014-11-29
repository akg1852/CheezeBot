var config = require("./config.js");
var flowdock = require("./flowdock.js");
var sqlite3 = require('sqlite3').verbose();

var utility = module.exports = {
	
	// pattern match command query
	matchQuery: function(query) {
		var pattern = "(?:(?:at\\s+(\\d\\d?:\\d\\d)\\s+)|" + // 1: time
			"(?:in\\s+([\\d.]+\\s*(?:second(?:s?)|minute(?:s?)|hour(?:s?)|day(?:s?)))\\s+))?" + // 2: duration
			"(?:when(ever)?\\s+" + // 3: repeating
			"(\\S+)\\s+says\\s+" + // 4: user
			"(?:something|\"([^\"]+)\")\\s+)?" + // 5: condition
			"(?:then\\s+)?(?:do\\s+)?" +
			"([\\s\\S]+)"; // 6: command
		var match = query.match(new RegExp("^\\s*" + config.botName + "\\s+" + pattern, "i"));
		if (match) return {
			user: (match[4] == "someone") ? undefined : match[4],
			time: match[3] ? undefined
				: match[2] ? utility.parseDuration(match[2]).getTime()
				: match[1] ? utility.parseTime(match[1]).getTime()
				: (new Date()).getTime(),
			condition: (match[5] == "something") ? undefined : match[5],
			command: (match[6] == "nothing") ? undefined : match[6]
		};
	},
	
	// parse time string
	parseTime: function(timeString) {
		var d = new Date();
		if (typeof(timeString) == "string") {
			d.setHours(parseInt(timeString));
			d.setMinutes(parseInt(timeString.split(":")[1]));
			d.setSeconds(0);
			if (d < new Date()) d.setHours(d.getHours() + 24);
		}
		return d;
	},
	
	// parse duration string
	parseDuration: function(durationString) {
		var d = new Date();
		if (typeof(durationString) == "string") {
			var duration = durationString.match(/^([\d.]+)\s*(second(?:s?)|minute(?:s?)|hour(?:s?)|day(?:s?))$/i) || [];
			var value = parseFloat(duration[1]);
			var units = duration[2];
			
			if (value && units) {
				if (units.indexOf("day") != -1) d.setDate(d.getDate() + value);
				else if (units.indexOf("hour") != -1) d.setHours(d.getHours() + value);
				else if (units.indexOf("minute") != -1) d.setMinutes(d.getMinutes() + value);
				else if (units.indexOf("second") != -1) d.setSeconds(d.getSeconds() + value);
				else if (d < new Date()) d.setHours(d.getHours() + 24);
			}
		}
		return d;
	},
	
	// pad string to length
	pad: function(len, str) {
		while (str.length < len) str += " ";
		return str;
	},
	
	// send an email
	email: function(email, context) {
		require('nodemailer').createTransport().sendMail(email, function(error, info) {
			if (!error) {
				var result = (info.rejected.length > 0) ? "Failed to send email" : "Email sent";
				if (context) flowdock.post(result, context);
				else console.log(result);
			}
			else {
				if (context) flowdock.post("Unable to send email", context);
				console.error("Error sending email: " + JSON.stringify(error) + "\n");
			}
		});
	},
	
	// connect to db
	dbConnect: function(callback) {
		var db = new sqlite3.Database('data.db');
		callback(db);
		db.close();
	},
}
