var config = require("../config.js");
var post = require("../flowdock.js").post;
var request = require('request');

module.exports = {
	synopsis: "video {search string}",
	description: "show a video based on a search string",
	pattern: /^(?:video|youtube)\s+(.+)/i,
	reply: function(match, context, callback) {
		request(encodeURI("https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&type=video&key=" +
		config.youtubeToken + "&q=" + match[1]),
			function(error, response, body) {
				if (!error && response.statusCode == 200) {
					var videoData = JSON.parse(body).items[0];
					if (videoData) {
						post("http://www.youtube.com/watch?v=" + videoData.id.videoId, context, callback);
					}
					else post("No suitable video found - try a different search", context, callback);
				}
				else {
					console.error("Error requesting video: " + JSON.stringify(error || response) + "\n");
				}
			});
	}
};
