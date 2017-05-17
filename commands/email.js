var utility = require("../utility.js");
var post = require("../slack.js").post;

module.exports = {
	synopsis: "email {addr} {subj} \\n {msg}",
	description: "send email",
	pattern: /^email\s+<[^\|]+\|(\S+@\S+)>\s+([^\n\r]+)\s+([\s\S]+)/i,
	reply: function(match, context, callback) {
		var email = {
			from: context.user.real_name + " <" + context.user.profile.email + ">",
			to: match[1],
			subject: match[2],
			text: match[3]
		};
		
		utility.email(email, context,
			function() { post("Email sent", context, callback); },
			function() { post("Unable to send email", context, callback); });
	}
};
