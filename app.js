// Require the Node Slack SDK package (github.com/slackapi/node-slack-sdk)
const { WebClient, LogLevel } = require("@slack/web-api");

// WebClient insantiates a client that can call API methods
// When using Bolt, you can use either `app.client` or the `client` passed to listeners.
const client = new WebClient(process.env.SLACK_BOT_TOKEN, {
  // LogLevel can be imported and used to make debugging simpler
  logLevel: LogLevel.DEBUG
});
// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");

// server.js
// where your node app starts
//const editJSONFile = require("edit-json-file")

//const {Axios} = require("axios");
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// You probably want to use a database to store any conversations information ;)
let conversationsStore = {};

async function populateConversationStore() {
  try {
    // Call the conversations.list method using the WebClient
    const result = await client.conversations.list();

    saveConversations(result.channels);
  } catch (error) {
    console.error(error);
  }
}

// Put conversations into the JavaScript object
function saveConversations(conversationsArray) {
  let conversationId = "";
  let conversationName = "";

  conversationsArray.forEach(function(conversation) {
    // Key conversation info on its unique ID
    conversationId = conversation["id"];
    conversationName = conversation["name"];

    // Store the channel id and corresponding channel name
    conversationsStore[conversationId] = conversationName;
    console.log(" conversation ---" + conversationId, conversationName);
  });
}

populateConversationStore();

app.message("#", async ({ message, say }) => {
  console.log(
    " Complete message is text is --------" +
      message.text +
      " permalink is " +
      message.channel
  );

  // function to get message URL
  const permalinkResult = await client.chat.getPermalink({
    channel: message.channel,
    message_ts: message.ts
  });

  //get the channel name from the message
  let channelId = message.text.split("<#");
  var arrayLength = channelId.length;
  for (var i = 0; i < arrayLength; i++) {
    //Do something
    let currChanelId = channelId[i].split("|")[0];
    console.log(
      "channelId[i] " + currChanelId + " message.channel " + message.channel
    );
    //console.log('currChanelId'+currChanelId);
    if (currChanelId != message.channel && currChanelId in conversationsStore) {
      try {
        // Call the chat.postMessage method using the WebClient
        const result = await client.chat.postMessage({
          channel: currChanelId,
          text: `This channel was hash-mentioned by <@${message.user}> in <#${message.channel}>  ${permalinkResult.permalink}`
        });

        // console.log(result);
      } catch (error) {
        console.error(error);
      }
    } else {
      console.log("no post for channel " + currChanelId);
    }
  }
});

app.event("message", async ({ message }) => {
  // console.log(message + " 1");

  if (message.subtype === "message_changed") {
    //   console.log(message, message.previous_message.text, message.text);
    //console.log('Prev message '+message.previous_message.text);
    //console.log(' Current msg '+ message.message.text);
    // Your logic here plz

    //   console.log(
    //      "message.channel " + message.channel + " message.ts " + message.ts
    //    );
    var permalinkResult;
    try {
      // Call the chat.postMessage method using the WebClient
      permalinkResult = await client.chat.getPermalink({
        channel: message.channel,
        message_ts: message.message.ts
      });
      // console.log(result);
    } catch (error) {
      console.error(error);
    }
    // var previosIds = retrunChannelIds(message.previous_message.text);
    var currentIds = message.message.text.split("<#");

    var arrayLength = currentIds.length;

    for (var i = 0; i < arrayLength; i++) {
      var currChannelId = currentIds[i].split("|")[0];
      // console.log(" Now checking for " + currentIds[i]);
      if (!message.previous_message.text.includes(currChannelId)) {
        if (
          currChannelId != message.channel &&
          currChannelId in conversationsStore
        ) {
          // Call the chat.postMessage method using the WebClient
          const result = await client.chat.postMessage({
            channel: currChannelId,
            text: `This channel was hash-mentioned by <@${message.message.user}> in <#${message.channel}>  ${permalinkResult.permalink}`
          });
        }
      }
    }
  }
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
