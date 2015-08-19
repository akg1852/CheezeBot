var post = require("../flowdock.js").post;
var request = require('request');

module.exports = {
	synopsis: "gif {search string}",
	description: "show a gif based on a search string",
	pattern: /^gif\s+(.+)/i,
	priority: 10,
	reply: function(match, context, callback) {
		request(encodeURI("http://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&limit=1&q=" + match[1]),
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					var imageData = JSON.parse(body).data[0];
					if (imageData) post(imageData.images.original.url, context, callback);
					else post("No suitable gif found - try a different search", context, callback);
				}
				else {
					console.error("Error requesting gif: " + JSON.stringify(error || response) + "\n");
				}
			});
	}
};
