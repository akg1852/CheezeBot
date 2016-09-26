var cluster = require('cluster');
var config = require("./config.js");
var commands = require("./commands.js");
var when = require("./when.js");
var flowdock = require("./flowdock.js");

var stream = {};
var loadedDelayed = false;

if (cluster.isMaster) {
	cluster.fork();
	cluster.on('exit', function(worker, code, signal) {
		console.log("restarting app");
		setTimeout(cluster.fork, 2000);
	});
}

if (cluster.isWorker) {
	run();
}

function run() {
	
	// check for connection
	if (stream.readable) {
		console.log("connected to flowdock stream");
		return;
	}
	console.log("connecting to flowdock stream");
	
	// connect to flowdock stream
	stream = flowdock.getStream();
	
	// create 'when' rule database
	when.createDB(function() {
		
		// get delayed commands
		when.getDelayed(function(r) {
			flowdock.setMetaData({ flow: r.flow, content: "<time delay rule triggered>" }, function(context) {
				setTimeout(function() {
					commands.execute(r.command, context);
					when.deleteByID(r.id);
				}, r.time - (new Date()).getTime());
			});
		});
		
		// listen for messages
		stream.on('data', function(context) {
			if (context.event == "message" && typeof context.content == "string") {
				flowdock.setMetaData(context, function(context) {
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
							isPing && (context.external_user_name != config.botName) ?
								function() { flowdock.post("Are you trying to talk to me?", context); } :
								null
						);
					}
				});
			}
		});
		
		// deal with stream failure
		stream.on('end', function() {
			console.log("flowdock stream ended");
			run();
		});
		stream.on('close', function() {
			console.log("flowdock stream closed");
			run();
		});
		stream.on('error', function(error) {
			console.error("flowdock stream error: " + JSON.stringify(error));
			run();
		});
		setTimeout(run, 2000);
	});
};
