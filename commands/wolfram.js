var config = require("../config.js");
var utility = require("../utility.js");
var post = require("../slack.js").post;
var request = require('request');
var xml2js = require('xml2js');

module.exports = {
	synopsis: "wolfram {search string}",
	description: "search wolfram alpha",
	pattern: /^wolfram\s+(.+)/i,
	reply: function(match, context, callback) {
		request(encodeURI("http://api.wolframalpha.com/v2/query?appid=" + config.wolframAlphaToken + "&input=" + match[1]),
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					xml2js.parseString(body, function (error, result) {
						if (result.queryresult.$.success == "true" && result.queryresult.pod) {
							post([].concat.apply([], result.queryresult.pod.map(function(p) {
								var podText = [].concat.apply([], p.subpod.map(function(sp) {
									return sp.plaintext[0].split("\n").map(function(t) { return t || null; });
								})).filter(function(t) { return t != null; }).join("\n");
								return podText ? p.$.title + ": \n```\n" + podText + "\n```" : null;
							})).filter(function(t) { return t != null; }).join("\n"), context, callback);
						}
						else post("No wolfram results found", context, callback);
					});
				}
				else {
					utility.log("Error requesting wolfram alpha information: " + JSON.stringify(error || response) + "\n");
				}
			});
	}
};
