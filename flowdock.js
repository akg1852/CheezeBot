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
	
	// get flow data
	getFlowData: function(flowID, callback) {
		var responses = 0;
		if (flowData[flowID]) callback(flowData[flowID]);
		
		else for (var i = 0; i < config.flows.length; i++) {
			request(encodeURI("https://" + config.flowdockToken + ":DUMMY@api.flowdock.com/flows/" +
				config.flows[i]), function(error, response, body) {
				responses++;
				if (!error && response.statusCode == 200) {
					var flow = JSON.parse(body);
					flowData[flow.id] = {
						id: flow.id,
						name: flow.organization.parameterized_name + "/" + flow.parameterized_name,
						token: flow.api_token
					};
				}
				else console.error("Error getting flow data: " + JSON.stringify(error || response) + "\n");
				
				if (responses == config.flows.length) callback(flowData[flowID]);
			});
		}
	},
	
	// set user and flow data
	setMetaData: function(context, callback) {
		flowdock.getFlowData(context.flow, function(flowData) {
			flowdock.getUserInfo(context, function(userInfo) {
				context.flow = flowData;
				context.user = userInfo;
				callback(context);
			});
		});
	},
	
	// post a message
	post: function(reply, context, callback) {
		var options = {
			url: encodeURI("https://api.flowdock.com/v1/messages/chat/" + context.flow.token),
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ "content": String(reply) || "[no reply]", "external_user_name": config.botName })
		};
		request(options, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log("\n---" + context.flow.name + "--- (" + now() + ")\n" + context.user.nick + ": " + context.content);
				console.log(config.botName + ": " + reply + "\n");
				if (callback) callback();
			}
			else {
				console.error("Error posting reply: " + JSON.stringify(error || response));
			}
		});
	},
};

// current date and time string
function now() {
	var d = new Date();
	return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate() + " " +
		d.getHours() + ":" + d.getMinutes();
}
