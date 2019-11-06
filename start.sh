#!/usr/bin/env bash

echo "Don't forget to adapt the ngrok.yml file to point to where you have put this repo."
echo "Also, you might have to go to https://api.slack.com/apps/APU7YF22X/event-subscriptions and change the URL of the event subscription to the grok URL you have set up with yarn start-tunnel."

if [[ -z "${SLACK_SIGNING_SECRET}" ]]; then
  echo "You need to set the SLACK_SIGNING_SECRET env variable; go to https://api.slack.com/apps/APU7YF22X and check 'Signing Secret' to get its value."
  exit 1
elif [[ -z "${SLACK_BOT_TOKEN}" ]]; then
  echo "You need to set the SLACK_BOT_TOKEN env variable; go to https://api.slack.com/apps/APU7YF22X/oauth, and check 'Bot User OAuth Access Token' to get its value."
  exit 1
elif [[ -z "${FILE_SYSTEM_URL}" ]]; then
  echo "You need to set the FILE_SYSTEM_URL env variable; run yarn start-tunnel in a seperate terminal if you haven't done it, and get the https URL that is next to 'file://....'. It should not end with a slash: for example, https://d93d31ca.ngrok.io."
  exit 1
elif [[ -z "${TOUCAN_TOCO_USERNAME}" ]]; then
  echo "You need to set the TOUCAN_TOCO_USERNAME env variable; configure a user that has access to the asset-portfolio small app on https://solutions.toucantoco.com/ and set its username on this variable."
  exit 1
elif [[ -z "${TOUCAN_TOCO_PASSWORD}" ]]; then
  echo "You need to set the TOUCAN_TOCO_PASSWORD env variable; It is the password of the user you have configured."
  exit 1
else
  node ./index.js
fi
