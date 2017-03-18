var config = require("../config.js");
var post = require("../slack.js").post;
var request = require('request');

module.exports = {
	synopsis: "pullrequests {user}/{repo} [{branch}]",
	description: "list open pull requests",
	pattern: /^(?:pullrequests?|prs?)\s+(\S+\/\S+)(?:\s+(\S+))?/i,
	reply: function(match, context, callback) {
		var repo = match[1].trim();
		var branch = match[2] ? match[2].trim() : undefined;
		var domain = config.githubDomain ? config.githubDomain + "/api/v3" : "https://api.github.com";
		var options = {
			url: encodeURI(domain + "/repos/" + repo + "/pulls?access_token=" + config.githubToken + (branch ? "&base=" + branch : "")),
			method: "GET",
			rejectUnauthorized: false,
			headers: { "User-Agent": config.botName }
		};
		request(options, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var prs = JSON.parse(body);
				if (prs.length) {
					var result = "Pull requests for " + repo + (branch ? " (" + branch + ")" : "") + ":";
					var addPRs = function(index) {
						index = index || 0;
						if (index >= prs.length) return post(result, context, callback);
						
						var pr = prs[index];
						options.url = pr._links.statuses.href.replace("/statuses/", "/status/");
						request(options, function(error, response, body) {
							result += "\n* " + pr.title + " (" + pr.html_url + ")";
							if (!error) {
								var status = JSON.parse(body);
								if (status.state == "failure") result += " :fire:";
								else if (status.state == "success") result += " :white_check_mark: ";
							}
							addPRs(index + 1);
						});
					}
					addPRs();
				}
				else post("no open pull requests for " + repo + (branch ? " (" + branch + ")" : ""), context, callback);
			}
			else {
				console.error("Error requesting github data: " + JSON.stringify(error || response) + "\n");
			}
		});
	}
};
