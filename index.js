var cluster = require('cluster');
var config = require("./config.js");
var commands = require("./commands.js");
var when = require("./when.js");
var slack = require("./slack.js");
var utility = require("./utility.js");

var stream = {};

if (cluster.isMaster) {
	cluster.fork();
	cluster.on('exit', function(worker, code, signal) {
		utility.log("restarting app");
		setTimeout(cluster.fork, 2000);
	});
}

if (cluster.isWorker) {
	
	// create 'when' rule database
	when.createDB(function() {

		slack.connect(
		
		// get delayed commands
		function() {
			when.getDelayed(function(r) {
				setTimeout(function() {
					commands.execute(r.command, {
						channel: r.channel,
						user: { id: 0, real_name: 'anon' },
						text: '<time delay rule triggered>'
					});
					when.deleteByID(r.id);
				}, r.time - (new Date()).getTime());
			});
		},
		// listen for messages
		function(event) {
			var context = JSON.parse(event.data);
			if (context.user) context.user = slack.users[context.user];

			if (context.type === 'message' && !context.hidden && context.user && !context.user.is_bot) {
				var query = when.matchQuery(context.text);
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
											channel: context.channel,
											user: context.user,
											ts: context.ts,
											thread_ts: context.thread_ts,
											text: '<time delay rule triggered>'
											});
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
							function() { slack.post('Are you trying to talk to me?', context); } :
							null
					);
				}
			}
		});
	});
};
