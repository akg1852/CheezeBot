var config = require("../config.js");
var post = require("../flowdock.js").post;
var request = require('request');

module.exports = {
	synopsis: "pullrequests {user}/{repo}",
	description: "list open pull requests",
	pattern: /^pullrequests\s+(.+\/.+)/i,
	reply: function(match, context, callback) {
		var repo = match[1].trim();
		var domain = config.githubDomain ? config.githubDomain + "/api/v3" : "https://api.github.com";
		var options = {
			url: encodeURI(domain + "/repos/" + repo + "/pulls?access_token=" + config.githubToken),
			method: "GET",
			rejectUnauthorized: false,
			headers: { "User-Agent": config.BotName }
		};
		request(options, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var prs = JSON.parse(body);
				if (prs.length) {
					var result = "Pull requests for " + repo + ":";
					for (var i = 0; i < prs.length; i++) {
						var pr = prs[i];
						result += "\n* [" + pr.title + "](" + pr.html_url + ")";
					}
					post(result, context, callback);
				}
				else post("no open pull requests for " + repo, context, callback);
			}
			else {
				console.error("Error requesting github data: " + JSON.stringify(error || response) + "\n");
			}
		});
	}
};
