var cluster = require('cluster');
var config = require("./config.js");
var commands = require("./commands.js");
var when = require("./when.js");
var slack = require("./slack.js");

var stream = {};

if (cluster.isMaster) {
	cluster.fork();
	cluster.on('exit', function(worker, code, signal) {
		console.log("restarting app");
		setTimeout(cluster.fork, 2000);
	});
}

if (cluster.isWorker) {
	
	// create 'when' rule database
	when.createDB(function() {
		
/*
		// get delayed commands
		when.getDelayed(function(r) {
			slack.setMetaData({ flow: r.flow, content: "<time delay rule triggered>" }, function(context) {
				setTimeout(function() {
					commands.execute(r.command, context);
					when.deleteByID(r.id);
				}, r.time - (new Date()).getTime());
			});
		});
*/
		
		// listen for messages
		slack.connect(function(event) {
			var context = JSON.parse(event.data);
			if (context.type === 'message' && !context.hidden) {
				
				if (context.text && context.text.match(new RegExp("^\\s*" + config.botName + "\\W+", "i"))){
					slack.post('hello', context);
				}
/*
				var query = when.matchQuery(context.content);
				var isPing = false;
				
				if (query) {
					if (query.command) {
						if (query.condition != null){
							when.add(query, context);
						}
						else if (query.time) {
							var now = (new Date()).getTime();
							if (query.time <= now) {
								if (!commands.execute(query.command, context)) {
									isPing = true;
								}
							}
							else {
								when.add(query, context, function(id) {
									setTimeout(function() {
										commands.execute(query.command, {
											flow: context.flow,
											user: context.user,
											thread: context.thread,
											content: "<time delay rule triggered>" });
										when.deleteByID(id);
									}, query.time - now);
								});
							}
						}
					}
					else when.deleteByQuery(query, context);
				}
				
				if (!query || isPing) {
					when.trigger(context,
						function(r) { commands.execute(r.command, context); },
						isPing ?
							function() { slack.post("Are you trying to talk to me?", context); } :
							null
					);
				}
*/
			}
		});
	});
};
