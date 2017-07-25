CheezeBot is a Slack bot created by Adam Gray.

Once you have cloned the project, setup involves making some changes:

* Edit `config.js`
	* `botName` is the name you want the bot to be summoned by
	* `slackToken` is your slack bot api token
	* the `about` string is a user-readable description of the bot
	* the other credentials are for specific command functionality
* Edit the contents of the `commands` directory to give the bot the functionality you require.
	Each command requires:
	* a `synopsis` and `description` for the help listing
	* a regex `pattern` to trigger the command
	* a `priority` (optional, 0 by default), which is a number used for determining the order in which commands are attempted to be matched against user input, and also for determining the order the commands appear in the help listing.
	* a `reply` method, which generates the bot's reply, and needs to call the `post` method (from `slack.js`). The `reply` method takes the following parameters:
		* the regex `match` array
		* the `context` object which represents data about the event (message) being replied to
		* a `callback` function, which should be passed on to the `post` method, or called directly (if it exists) if `reply` has a successful termination state which doesn't result in a post.

Now you're ready to run the bot:

* run `npm install` to install the required packages
* open a bash terminal and run `start.sh` to start the bot
