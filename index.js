var config = require("./config.js");
var commands = require("./commands.js");
var when = require("./when.js");
var slack = require("./slack.js");
var utility = require("./utility.js");

// periodically kill the process to get a clean slate (and let 'forever' restart it)
setInterval(function(){
	utility.log('Doing a periodic restart of the app');
	process.exit();
}, config.restartMinutes * 60 * 1000);

// create 'when' rule database
when.createDB(function() {

	slack.connect(
	
	// onconnect:
	function() {
		// get delayed commands
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
	// onmessage:
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
