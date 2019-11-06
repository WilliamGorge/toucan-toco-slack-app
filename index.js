const {App} = require('@slack/bolt');
const fs = require('fs');
const rp = require('request-promise');
const request = require('request');

const INSTANCE = 'solutions';
const SMALL_APP = 'asset-portfolio';

async function login() {
  return (await rp({
    method: 'POST',
    uri: `https://api-${INSTANCE}.toucantoco.com/login`,
    body: {
      username: `${process.env.TOUCAN_TOCO_USERNAME}`,
      password: `${process.env.TOUCAN_TOCO_PASSWORD}`,
    },
    json: true,
  })).token;
}

async function getFrontConfig(toucanTocoAuthToken) {
  return await rp({
    uri: `https://api-${INSTANCE}.toucantoco.com/${SMALL_APP}/config`,
    headers: {
      'Authorization': `Bearer ${toucanTocoAuthToken}`,
    },
    json: true,
  });
}

function isStory(slide) {
  return slide.chartOptions || slide.charts;
}

async function findStory(storyName, toucanTocoAuthToken) {
  const frontConfig = await getFrontConfig(toucanTocoAuthToken);
  return frontConfig.slides.find((slide) => slide.title &&
      slide.title.toLowerCase().includes(storyName.toLowerCase()) &&
      isStory(slide));
}

function getRenderBody(itemToRender) {
  if(itemToRender === 'execsum') {
     return {
       // TODO hack for demo
       url: `https://${INSTANCE}.toucantoco.com/augmented-hr-management/execsum?export=true`,
       smallapp: SMALL_APP,
       width: 827,
       height: 1170,
       deviceScaleFactor: 0.7,
       lang: 'en',
       format: 'img',
       elementSelector: '.execsum-grid-view',
     };
  } else {
    return {
      url: `https://${INSTANCE}.toucantoco.com/${SMALL_APP}?slide=${itemToRender}&export=true`,
      smallapp: SMALL_APP,
      width: 1280,
      height: 618,
      deviceScaleFactor: 1,
      lang: 'en',
      format: 'img',
      elementSelector: '.tc-slide__content, .tc-story',
    }
  }
}


async function downloadImage(itemToRender, toucanTocoAuthToken, say) {
  const filename = await rp({
    method: 'POST',
    uri: `https://api-${INSTANCE}.toucantoco.com/render`,
    body: getRenderBody(itemToRender),
    headers: {
      'Authorization': `Bearer ${toucanTocoAuthToken}`,
    },
    json: true,
  });
  console.log(filename);
  console.log('token', toucanTocoAuthToken);
  say('I am downloading it now...');
  const success = await new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      const imageRequest = request({
        uri: `https://api-${INSTANCE}.toucantoco.com/render?filename=${filename}`,
        headers: {
          'Authorization': `Bearer ${toucanTocoAuthToken}`,
        },
      });
      imageRequest.on('response', (response) => {
        if(!response) {
          console.log('No response')
        } else if (`${response.statusCode}`.startsWith('2')) {
          imageRequest.pipe(fs.createWriteStream(`${filename}.png`)).
              on('close', () => resolve(true));
          clearInterval(intervalId);
        }
      })
    }, 5000);
    setTimeout(() => {
      clearInterval(intervalId);
      reject('Could not get image after 1 minute');
    }, 5000 * 12);
  }).catch(console.error);
  if (success) {
    return filename;
  } else {
    return null;
  }
}

function displayStory(say, title, filename, footerLink) {
  say({
    blocks: [
      {
        'type': 'image',
        'title': {
          'type': 'plain_text',
          'text': `Toucan Toco - "${title}"`,
        },
        'image_url': `${process.env.FILE_SYSTEM_URL}/${filename}.png`,
        'alt_text': `Toucan Toco - "${title}"`,
      },
      {
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': `You can find it here: ${footerLink}`,
        },
      },
    ],
  });
}

const CRONS = {
  'everyday': '30 9 * * *',
  'every week': '30 9 * * MON',
  'every month': '30 9 1 * *',
};

async function getAvailableStories(toucanTocoAuthToken) {
  const frontConfig = await getFrontConfig(toucanTocoAuthToken);
  return frontConfig.slides.filter(isStory).
      map((slide) => `- ${slide.title}`).
      join('\n');
}

// TODO add diffrerent commands like "set instance", "set small app"...?
async function handleRequest(userRequest, isCommand, say) {
  console.log(userRequest);
  if (!userRequest) {
    if (isCommand) {
      say('Hello! :wave: I am the Toucan Toco bot, I can show you data stories! :sparkles:\n\nUse `/toucantoco show Incredible Story` to show a story named "Incredible Story".\n\nYou can do `/toucantoco show Important Story everyday` to show the story named "Important Story" every day.\n\nYou also can @ mention me and I will do the same for you :heart:.');
    } else {
      say('Hello! :wave: I am the Toucan Toco bot, I can show you data stories! :sparkles:\n\nUse `@Toucan Toco show Incredible Story` to show a story named "Incredible Story".\n\nYou can do `@Toucan Toco show Important Story everyday` to show the story named "Important Story" every day.\n\nYou also write the command `/toucantoco` me and I will do the same for you :heart:.');
    }
    setTimeout(() => {
      say(`Currently, I am watching the small app "${SMALL_APP}" of the instance "${INSTANCE}"`);
    }, 200);
  } else if (userRequest.startsWith('list')) {
    const toucanTocoAuthToken = await login();
    const storiesDisplayString = await getAvailableStories(toucanTocoAuthToken);
    say(`Here are the available stories:\n${storiesDisplayString}`);
  } else if (userRequest.startsWith('show ')) {
    const toucanTocoAuthToken = await login();
    const storyQuery = userRequest.replace('show ', '').toLowerCase();
    let matchingCron = Object.keys(CRONS).
        find((cron) => storyQuery.endsWith(` ${cron}`));
    if (matchingCron) {
      const storyName = storyQuery.replace(` ${matchingCron}`, '');
      const story = await findStory(storyName, toucanTocoAuthToken, say);
      if (!story) {
        say(`Sorry, I could not find any story corresponding to ${storyName}`);
        return;
      }
      say(`OK, got it! I will show you "${story.title}" ${matchingCron} at 9:30 AM.`);
    } else {
      if(storyQuery === 'execsum') {
        say(`Let's go! Give me a few seconds while I get you the execsum.`);
        const filename = await downloadImage('execsum', toucanTocoAuthToken, say);
        if (filename) {
          say('Here it is!');
          const footerLink = `https://${INSTANCE}.toucantoco.com/${SMALL_APP}`;
          displayStory(say, 'Execsum', filename, footerLink);
        } else {
          say('Sorry, an error occurred while generating your execsum.');
        }
      } else {
        say(`Right away! Give me a few seconds while I get you the "${storyQuery}" story.`);
        const toucanTocoAuthToken = await login();
        const story = await findStory(storyQuery, toucanTocoAuthToken, say);
        if (!story) {
          const storiesDisplayString = await getAvailableStories(
              toucanTocoAuthToken);
          say(`Sorry, I could not find any story corresponding to "${storyQuery}" in the available stories:\n${storiesDisplayString}`);
          return;
        }
        say(`I found the story "${story.title.toUpperCase()}"`);
        const filename = await downloadImage(story.id, toucanTocoAuthToken, say);
        if (filename) {
          say('Here it is!');
          const footerLink = `https://${INSTANCE}.toucantoco.com/${SMALL_APP}?slide=${story.id}`;
          displayStory(say, story.title, filename, footerLink);
        } else {
          say('Sorry, an error occurred while generating your story.');
        }
      }
    }
  } else {
    say('Sorry, i did not understand what you meant. You can use the following commands: "show"');
  }
}

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

app.command('/toucantoco', async ({command, ack, say}) => {
  ack();
  await handleRequest(command.text.trim(), true, say).catch((error) => {
    console.error(error);
    say('Sorry, an error occurred while generating your story.');
  });
});

app.event('app_mention', async ({event, say, context}) => {
  await handleRequest(event.text.substr(context.botId.length + 3).trim(), false,
      say).catch((error) => {
    console.error(error);
    say('Sorry, an error occurred while generating your story.');
  });
});

/*****************/

(async () => {
  // Start the app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
