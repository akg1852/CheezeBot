CheezeBot is a FlowDock bot created by Adam Gray.

Once you have cloned the project, setup involves making some changes:

* edit config.js
	* botName is the name you want the bot to be summoned by
	* flowdockToken is your flowdock user's api token
	* the flows array is a list of flows the bot listens to, in the format "org/flow"
	* the about string is a user-readable description of the bot
	* the other credentials are for specific command functionality
* edit the commands.js array to give the bot the functionality you require
	each command requires:
	* a 'description' for the help listing
	* a regex 'pattern' to trigger the command
	* a 'reply' method which takes parameters:
		* the regex 'match' array
		* the flowdock stream 'context' object
	  the 'reply' method returns the bot's reply (or null for no reply)
	  (alternatively, 'reply' can call the 'post' method directly, which is useful inside a callback)

Now you're ready to run the bot:

* "npm install" the required packages
* run the bot by typing "node index.js" from the terminal