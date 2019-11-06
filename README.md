## How to run the bot

1. Adapt `ngrok.yml` to point to the directory where you have put this repo.
2. Run `yarn start-tunnel`
4. Configure a user that has access to the asset-portfolio small app on https://solutions.toucantoco.com/
5. Open a seperate terminal and set the following evironment variables:
    - `SLACK_SIGNING_SECRET`:  go to https://api.slack.com/apps/APU7YF22X and check 'Signing Secret' 
    - `SLACK_BOT_TOKEN`: go to https://api.slack.com/apps/APU7YF22X/oauth, and check 'Bot User OAuth Access Token'
    - `FILE_SYSTEM_URL`: In the first terminal where `yarn start-tunnel` is running, get the https URL that is next to 'file://....'. It should not end with a slash: for example, https://d93d31ca.ngrok.io
    - `TOUCAN_TOCO_USERNAME`: the username of the user on solutions
    - `TOUCAN_TOCO_PASSWORD`: the username of the user on solutions
6. Run `yarn start-service`
7. Go to https://api.slack.com/apps/APU7YF22X/event-subscriptions and change the URL of the event subscription to the grok URL you have set up with `yarn start-tunnel`. 
It is the one next to http://localhost:3000, and you have to add `/slack/events`, for example with `http://08460448.ngrok.io -> http://localhost:3000` it is `http://08460448.ngrok.io/slack/events`.
7. Go to https://api.slack.com/apps/APU7YF22X/slash-commands modify the /toucantoco command with the same url.
8. Go to slack, create a channel for testing and type `/toucantoco` or `@Toucan Toco`

It should work!
