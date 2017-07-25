var config = require("../config.js");
var utility = require("../utility.js");
var post = require("../slack.js").post;
var request = require('request');

module.exports = {
		synopsis: "weather {city}",
		description: "weather forecast information",
		pattern: /^weather\s+(.+)/i,
		reply: function(match, context, callback) {
			request(encodeURI("http://autocomplete.wunderground.com/aq?query=" + match[1]), function(error, response, body) {
				if (!error && response.statusCode == 200) {
					var cities = JSON.parse(body).RESULTS;
					if (cities.length)  {
						request(encodeURI("http://api.wunderground.com/api/" + config.weatherUndergroundToken +
						"/forecast10day" + cities[0].l + ".json"),
							function(error, response, body) {
								if (!error && response.statusCode == 200) {
									var forecast = JSON.parse(body).forecast;
									if (forecast) {
										var forecastDays = forecast.simpleforecast.forecastday;
										var result = "Weather forecast for " + cities[0].name + ":\n```";
										for (var i = 0; i < 7; i++) {
											var day = forecastDays[i];
											result += "\n*  " + utility.pad(15, day.date.weekday + ":") +
												utility.pad(20, day.conditions).substr(0, 20) + "| " +
												day.high.celsius + "/" + day.low.celsius + "°C\t| " +
												day.avewind.kph + "kph " + day.avewind.dir;
										}
                                        result += "\n```";
										post(result, context, callback);
									}
									else post("No weather information found", context, callback);
								}
								else utility.log("Error requesting weather information: " + JSON.stringify(error || response) + "\n");
							});
					}
					else post("No city found matching search", context, callback);
				}
				else {
					utility.log("Error requesting weather information: " + JSON.stringify(error || response) + "\n");
				}
			});
		}
	};
