var post = require("./flowdock.js").post;
var sqlite3 = require('sqlite3').verbose();

var utility = module.exports = {
	
	// parse time string
	parseTime: function(timeString) {
		var d = new Date();
		if (typeof(timeString) == "string") {
			d.setHours(parseInt(timeString));
			d.setMinutes(parseInt(timeString.split(":")[1]));
			d.setSeconds(0);
			d.setMilliseconds(0);
			if (d < new Date()) d.setHours(d.getHours() + 24);
		}
		return d;
	},
	
	// parse duration string
	parseDuration: function(durationString) {
		var d = new Date();
		if (typeof(durationString) == "string") {
			var duration = durationString.match(/^([\d.]+)\s*(second(?:s?)|minute(?:s?)|hour(?:s?)|day(?:s?))$/i) || [];
			var value = parseFloat(duration[1]);
			var units = duration[2];
			
			if (value && units) {
				if (units.indexOf("day") != -1) d.setDate(d.getDate() + value);
				else if (units.indexOf("hour") != -1) d.setHours(d.getHours() + value);
				else if (units.indexOf("minute") != -1) d.setMinutes(d.getMinutes() + value);
				else if (units.indexOf("second") != -1) d.setSeconds(d.getSeconds() + value);
				else if (d < new Date()) d.setHours(d.getHours() + 24);
			}
			d.setSeconds(0);
			d.setMilliseconds(0);
		}
		return d;
	},
	
	// format unix time as time string
	formatTime: function(time) {
		var t = new Date(time);
		return t.getHours() + ":" + ("0" + t.getMinutes()).substr(-2);
	},
	
	// pad string to length
	pad: function(len, str) {
		while (str.length < len) str += " ";
		return str;
	},
	
	// send an email
	email: function(email, context) {
		require('nodemailer').createTransport().sendMail(email, function(error, info) {
			if (!error) {
				var result = (info.rejected.length > 0) ? "Failed to send email" : "Email sent";
				if (context) post(result, context);
				else console.log(result);
			}
			else {
				if (context) post("Unable to send email", context);
				console.error("Error sending email: " + JSON.stringify(error) + "\n");
			}
		});
	},
	
	// connect to db
	dbConnect: function(callback) {
		var db = new sqlite3.Database('data.db');
		callback(db);
		db.close();
	},
}
