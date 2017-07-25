module.exports = {
	
	// CORE CONFIG:
	botName: "",
	slackToken: "",
	about: ["CheezeBot by Adam-G",
		"Suggestions or contributions welcome: github.com/akg1852/CheezeBot/",,
		"API Credits:",
		"Slack: api.slack.com",
		"Weather Underground: wunderground.com/weather/api",
		"GitHub: developer.github.com/v3/",
		"Giphy: github.com/giphy/giphyapi",
		"YouTube: developers.google.com/youtube/v3/",
		"Wolfram Alpha: http://products.wolframalpha.com/api/"
		].join("\n"),
	wheneverRefractorySeconds: 5,
	restartMinutes: 60,
	
	// COMMAND CONFIG:
	githubToken: "",
	githubDomain: "",
	weatherUndergroundToken: "",
	youtubeToken: "",
	wolframAlphaToken: "",
}
