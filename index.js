var commands = require("./commands.js");
var when = require("./when.js");
var flowdock = require("./flowdock.js");

var stream = {};
var loadedDelayed = false;

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
					if (query) {
						if (query.command) {
							if (query.condition != null){
								when.add(query, context);
							}
							else if (query.time) {
								var now = (new Date()).getTime();
								if (query.time <= now) {
									commands.execute(query.command, context);
								}
								else {
									when.add(query, context, function(id) {
										setTimeout(function() {
											commands.execute(query.command, {
												flow: context.flow,
												user: context.user,
												content: "<time delay rule triggered>" });
											when.deleteByID(id);
										}, query.time - now);
									});
								}
							}
						}
						else when.deleteByQuery(query, context);
					}
					else when.trigger(context, function(r) {
						commands.execute(r.command, context);
					});
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
run();
