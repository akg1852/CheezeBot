var config = require("./config.js");
var request = require('request');
var sqlite3 = require('sqlite3').verbose();

// get flowdock flow data
// TODO: make this a utility method, similar to getUserInfo()
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
var userInfo = {};

var utility = module.exports = {
	
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
