module.exports = {
	
	// CORE CONFIG:
	botName: "",
	flowdockToken: "",
	flows: [],
	about: ["CheezeBot by Adam-G",
		"Suggestions or [contributions](github.com/akg1852/CheezeBot/) welcome.",,
		"API Credits:",
		"[Flowdock](flowdock.com/api)",
		"[Weather Underground](wunderground.com/weather/api)", "[GitHub](developer.github.com/v3/)", "[Giphy](github.com/giphy/giphyapi)",
		"[YouTube](developers.google.com/youtube/v3/)", "[Wolfram Alpha](http://products.wolframalpha.com/api/)"].join("\n"),
	wheneverRefractorySeconds: 5,
	
	// COMMAND CONFIG:
	githubToken: "",
	githubDomain: "",
	weatherUndergroundToken: "",
	youtubeToken: "",
	wolframAlphaToken: "",
}
