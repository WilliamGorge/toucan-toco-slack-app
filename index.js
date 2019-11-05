const {App} = require('@slack/bolt');
const fs = require('fs');
const rp = require('request-promise');
const request = require('request');

async function login() {
  return (await rp({
    method: 'POST',
    uri: 'https://api-demo-staging.toucantoco.com/login',
    body: {
      username: 'slackbot@dev+toucantoco.com',
      password: 'S7QYeIN4kgcA',
    },
    json: true,
  })).token;
}

async function findStory(storyName, toucanTocoAuthToken) {
  const frontConfig = await rp({
    uri: 'https://api-demo-staging.toucantoco.com/demo/config',
    headers: {
      'Authorization': `Bearer ${toucanTocoAuthToken}`,
    },
    json: true,
  });
  return frontConfig.slides.find((slide) => slide.title.toLowerCase().includes(storyName.toLowerCase()) && slide.chartOptions);
}

async function downloadImage(storyId, toucanTocoAuthToken, say) {
  const filename = await rp({
    method: 'POST',
    uri: 'https://api-demo-staging.toucantoco.com/render',
    body: {
      url: `https://demo-staging.toucantoco.com/demo?view=Europe&report=Europe&slide=${storyId}&export=true`,
      smallapp: 'demo',
      width: 1280,
      height: 618,
      deviceScaleFactor: 1,
      lang: 'en',
      format: 'img',
      elementSelector: '.tc-slide__content, .tc-story',
    },
    headers: {
      'Authorization': `Bearer ${toucanTocoAuthToken}`,
    },
    json: true,
  });
  say('I am downloading it now...');
  const success = await new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      const imageRequest = request({
        uri: `https://api-demo-staging.toucantoco.com/render?filename=${filename}`,
        headers: {
          'Authorization': `Bearer ${toucanTocoAuthToken}`,
        },
      });
      imageRequest.on('response', (response) => {
        if (response.statusCode === 200) {
          imageRequest
            .pipe(fs.createWriteStream(`${filename}.png`))
            .on('close', () => resolve(true));
        }
      });
    }, 5000);
    setTimeout(() => {
      clearInterval(intervalId);
      reject('Could not get image after 1 minute');
    }, 5000 * 12);
  }).catch(console.error);
  if(success) {
    return filename;
  } else {
    return null;
  }
}

function displayStory(say, command, filename) {
  say({
    blocks: [
      {
        'type': 'image',
        'title': {
          'type': 'plain_text',
          'text': `Toucan Toco - "${command.text}".`,
        },
        'block_id': `Story_${command.text}`,
        'image_url': `https://52951a2c.ngrok.io/${filename}.png`,
        'alt_text': `Toucan Toco - "${command.text}"`,
      },
    ],
  });
}

const CRONS = {
  'everyday': '30 9 * * *',
  'every week': '30 9 * * MON',
  'every month': '30 9 1 * *',
};

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

// TODO add diffrerent commands like "show" or "set instance" and "set small app"?
app.command('/toucantoco', async ({command, ack, say}) => {
  ack();
  console.log(command.text);
  if(!command.text.replace(' ', '')) {
    say('Hello! I am the Toucan Toco bot, I can show you data stories! Use "show" to show a story directly or schedule it.')
  } else if(command.text.startsWith('show ')) {
    const toucanTocoAuthToken = await login();
    const storyQuery = command.text.replace('show ', '').toLowerCase();
    let matchingCron = Object.keys(CRONS).find((cron) => storyQuery.endsWith(` ${cron}`));
    if(matchingCron) {
      const storyName = storyQuery.replace(` ${matchingCron}`, '');
      const story = await findStory(storyName, toucanTocoAuthToken, say);
      if (!story) {
        say(`Sorry, I could not find any story corresponding to ${storyName}`);
        return;
      }
      say(`OK, got it! I will show you "${story.title}" ${matchingCron} at 9:30 AM.`);
    } else {
      say(`Right away! Give me a few seconds while I get you a "${storyQuery}" story.`);
      const toucanTocoAuthToken = await login();
      const story = await findStory(storyQuery, toucanTocoAuthToken, say);
      if (!story) {
        say(`Sorry, I could not find any story corresponding to ${storyQuery}`);
        return;
      }
      say(`I found the story "${story.title}"`);
      const filename = await downloadImage(story.id, toucanTocoAuthToken, say);
      if (filename) {
        say('Here it is!');
        displayStory(say, story.title, filename);
      } else {
        say('Sorry, an error occurred while generating your story.')
      }
    }
  } else {
    say('Sorry, i did not understand what you meant. You can use the following commands: "show"');
  }
});

/*****************/

(async () => {
  // Start the app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
