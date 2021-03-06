var post = require("../slack.js").post;

module.exports = {
	synopsis: "roll {dice}d{sides}",
	description: "roll dice (eg roll 2d6)",
	pattern: /^roll\s+(\d*)d(\d+)/i,
	reply: function(match, context, callback) {
		var dice = Number(match[1]) || 1;
		var sides = Number(match[2]);
		var result = "";
		for (var i = 0; i < dice; i++) {
			result += (Math.floor(Math.random() * sides) + 1) + " ";
		}
		post(result, context, callback);
	}
};
