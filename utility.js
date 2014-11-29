var config = require("./config.js");
var request = require('request');
var sqlite3 = require('sqlite3').verbose();
var userInfo = {};

// get flowdock flow data
var flowData = {};
for (var i = 0; i < config.flows.length; i++) {
	request(encodeURI("https://" + config.flowdockToken + ":DUMMY@api.flowdock.com/flows/" + config.flows[i]), function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var flow = JSON.parse(body);
			flowData[flow.id] = { name: flow.organization.parameterized_name + "/" + flow.parameterized_name, token: flow.api_token };
		}
		else console.error("Error getting flow data: " + JSON.stringify(error || response) + "\n");
	});
}

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
	
	// get flowdock user info
	getUserInfo: function(id, callback) {
		if (userInfo[id]) callback(userInfo[id]);
			
		else request(encodeURI("https://" + config.flowdockToken + ":DUMMY@api.flowdock.com/users/" + id),
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					userInfo[id] = JSON.parse(body);
					callback(userInfo[id]);
				}
				else console.error("Error requesting user info: " + JSON.stringify(error || response) + "\n");
			});
	},
	
	// post a message to flowdock
	post: function(reply, context) {
		var flow = flowData[context.flow];
		var options = {
			url: encodeURI("https://api.flowdock.com/v1/messages/chat/" + flow.token),
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ "content": reply.toString(), "external_user_name": config.botName })
		};
		request(options, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				utility.getUserInfo(context.user, function(user) {
					console.log("\n---" + flow.name + "--- (" + utility.now() + ")\n" + user.nick + ": " + context.content);
					console.log(config.botName + ": " + reply + "\n");
				})
			}
			else console.error("Error posting reply: " + JSON.stringify(error || response));
		});
	},
	
	// current time
	now: function() {
		var d = new Date();
		return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate() + " " +
			d.getHours() + ":" + d.getMinutes();
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
				if (context) utility.post(result, context);
				else console.log(result);
			}
			else {
				if (context) utility.post("Unable to send email", context);
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
