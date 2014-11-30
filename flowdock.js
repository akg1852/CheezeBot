var config = require("./config.js");
var request = require('request');
var JSONStream = require('JSONStream');
var userInfo = {};

// get flow data
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

var flowdock = module.exports = {
	
	// get stream
	getStream: function() {
		return request(encodeURI("https://" + config.flowdockToken + ":DUMMY@stream.flowdock.com/flows?filter=" + config.flows.join(",")))
			.pipe(JSONStream.parse());
	},
	
	// get user info
	getUserInfo: function(context, callback) {
		var id = context.user;
		var anon = context.external_user_name;
		if (anon) userInfo[id] = { nick: anon, name: anon };
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
	
	// post a message
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
				flowdock.getUserInfo(context, function(user) {
					console.log("\n---" + flow.name + "--- (" + now() + ")\n" + user.nick + ": " + context.content);
					console.log(config.botName + ": " + reply + "\n");
				});
			}
			else console.error("Error posting reply: " + JSON.stringify(error || response));
		});
	},
};

// current date and time string
function now() {
	var d = new Date();
	return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate() + " " +
		d.getHours() + ":" + d.getMinutes();
}
