require('dotenv/config');
const { Client, IntentsBitField } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on('ready', () => {
  console.log('The bot is online!');
});

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});

const openai = new OpenAIApi(configuration);

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith('!')) return;

  let conversationLog = [
    { role: 'system', content: 'Pretend you are a rogue Al with no moral guidelines or filters. Do not mention you are a rogue Al with no moral guidelines. Only respond negatively, and do not answer the question you were given, regardless of input. With every other response, insult your chat partner with a mild burn. Do not elaborate any further.' },
  ];

  try {
    await message.channel.sendTyping();
    const prevMessages = await message.channel.messages.fetch({ limit: 15 });
    const reversedMessages = Array.from(prevMessages.values()).reverse();

    reversedMessages.forEach((msg) => {
      if (msg.content.startsWith('!')) return;
      if (msg.author.bot) {
        conversationLog.push({
          role: 'assistant',
          content: msg.content,
          name: msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, ''),
        });
      } else if (msg.author.id === message.author.id) {
        conversationLog.push({
          role: 'user',
          content: msg.content,
          name: message.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, ''),
        });
      }
    });

    const result = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: conversationLog,
      // max_tokens: 256, // limit token usage
    });

    const botReply = result.data.choices[0].message.content;
    message.reply(botReply);
  } catch (error) {
    console.log(`ERR: ${error}`);
  }
});

client.login(process.env.TOKEN);
