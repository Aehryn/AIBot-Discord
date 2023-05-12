const { Client, Intents, ApplicationCommandOptionType } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

const client = new Client({
  intents: [
    Intents.FLAGS.Guilds,
    Intents.FLAGS.GuildMessages,
    Intents.FLAGS.MessageContent,
    Intents.FLAGS.GuildMembers,
  ],
});

const configuration = new Configuration({
  apiKey: process.env.API_KEY || '',
});
const openai = new OpenAIApi(configuration);

const aiEnabledUsers = new Set();
const MAX_MESSAGE_LENGTH = 2000;

client.on('ready', async () => {
  console.log('The bot is online!!!');

  try {
    const guildId = process.env.GUILD_ID || '';
    const commands = await client.guilds.cache.get(guildId)?.commands.set([
      {
        name: 'noai',
        description: 'Toggle AI responses for your messages',
        options: [
          {
            name: 'toggle',
            description: 'Toggle AI responses on or off',
            type: ApplicationCommandOptionType.STRING,
            required: true,
            choices: [
              {
                name: 'on',
                value: 'on',
              },
              {
                name: 'off',
                value: 'off',
              },
            ],
          },
        ],
      },
    ]);
    console.log('Registered slash commands:');
    console.log(commands);
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'noai') {
    const toggle = interaction.options.getString('toggle')?.toLowerCase();
    if (toggle === 'on') {
      aiEnabledUsers.delete(interaction.user.id);
      await interaction.reply('AI is now disabled for your messages.');
    } else if (toggle === 'off') {
      aiEnabledUsers.add(interaction.user.id);
      await interaction.reply('AI is now enabled for your messages.');
    } else {
      await interaction.reply('Invalid usage. Correct syntax: `/noai on` or `/noai off`');
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;

  if (aiEnabledUsers.has(message.author.id)) {
    let conversationLog = [{ role: 'system', content: 'You are a friendly chatbot.' }];

    try {
      await message.channel.sendTyping();

      let prevMessages = await message.channel.messages.fetch({ limit: 15 });
      prevMessages = prevMessages.array().reverse();

      prevMessages.forEach((msg) => {
        if (msg.author.id !== client.user.id && !msg.author.bot) {
          conversationLog.push({
            role: 'user',
            content: msg.content,
          });
        }
      });

      conversationLog.push({
        role: 'user',
        content: message.content,
      });

      const result = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: conversationLog,
      });

      let text = result.data.choices[0].message.content;
      if (text.length > MAX_MESSAGE_LENGTH) {
        text = text.slice(0, MAX_MESSAGE_LENGTH) + '...';
      }

      await message.reply(text);
    } catch (error) {
      console.error('Error:', error);
    }
  }
});

const token = process.env.TOKEN || '';
client
