var config = require("./config.js");
var request = require('request');
var JSONStream = require('JSONStream');

var flowData = {};
var userInfo = {};

var flowdock = module.exports = {
	
	// get stream
	getStream: function() {
		return request(encodeURI("https://" + config.flowdockToken + ":DUMMY@stream.flowdock.com/flows?filter=" + config.flows.join(",")))
			.pipe(JSONStream.parse());
	},
	
	// get user info
	getUserInfo: function(context, callback) {
		var id = parseInt(context.user) || 0;
		if (!id) {
			var name = context.external_user_name || "(anonymous)";
			userInfo[id] = { nick: name, name: name };
		}
		
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
	post: function(reply, context, callback) {
		getFlowData(context.flow, function(flow) {
			var options = {
				url: encodeURI("https://api.flowdock.com/v1/messages/chat/" + flow.token),
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ "content": String(reply) || "[no reply]", "external_user_name": config.botName })
			};
			request(options, function(error, response, body) {
				if (!error && response.statusCode == 200) {
					flowdock.getUserInfo(context, function(user) {
						console.log("\n---" + flow.name + "--- (" + now() + ")\n" + user.nick + ": " + context.content);
						console.log(config.botName + ": " + reply + "\n");
						if (callback) callback();
					});
				}
				else console.error("Error posting reply: " + JSON.stringify(error || response));
			});
		});
	},
};

// get flow data
function getFlowData(flowID, callback) {
	var responses = 0;
	if (flowData[flowID]) callback(flowData[flowID]);
	
	else for (var i = 0; i < config.flows.length; i++) {
		request(encodeURI("https://" + config.flowdockToken + ":DUMMY@api.flowdock.com/flows/" +
			config.flows[i]), function(error, response, body) {
			responses++;
			if (!error && response.statusCode == 200) {
				var flow = JSON.parse(body);
				flowData[flow.id] = { name: flow.organization.parameterized_name + "/" + flow.parameterized_name, token: flow.api_token };
			}
			else console.error("Error getting flow data: " + JSON.stringify(error || response) + "\n");
			
			if (responses == config.flows.length) callback(flowData[flowID]);
		});
	}
}

// current date and time string
function now() {
	var d = new Date();
	return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate() + " " +
		d.getHours() + ":" + d.getMinutes();
}
