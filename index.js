const { Client, Intents, ApplicationCommandOptionType } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

// Create a new instance of the Discord client
const client = new Client({
  intents: [
    Intents.FLAGS.GUILD
    Intents.FLAGS.MESSAGE
    Intents.FLAGS.MESSAGE_CONTENTS
    Intents.FLAGS.GUILD_MEMBERS    
  ],
});

// Create a new instance of the OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.API_KEY || '',
});
const openai = new OpenAIApi(configuration);

// Create a set to store user IDs for enabling/disabling AI
const aiEnabledUsers = new Set();

// Maximum length for AI-generated messages
const MAX_MESSAGE_LENGTH = 2000;

// Event: Bot is ready and connected to Discord
client.on('ready', async () => {
  console.log('The bot is online!!!');

  try {
    // Get the guild ID from environment variables
    const guildId = process.env.GUILD_ID || '';

    // Register slash commands for the guild
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

// Event: User interaction with slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'noai') {
    // Get the toggle option from the interaction
    const toggle = interaction.options.getString('toggle')?.toLowerCase();

    if (toggle === 'on') {
      // Disable AI for the user
      aiEnabledUsers.delete(interaction.user.id);
      await interaction.reply('AI is now disabled for your messages.');
    } else if (toggle === 'off') {
      // Enable AI for the user
      aiEnabledUsers.add(interaction.user.id);
      await interaction.reply('AI is now enabled for your messages.');
    } else {
      await interaction.reply('Invalid usage. Correct syntax: `/noai on` or `/noai off`');
    }
  }
});

// Event: User message in a designated channel
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;

  if (aiEnabledUsers.has(message.author.id)) {
    // Create a conversation log with a system message
    let conversationLog = [{ role: 'system', content: 'You are a friendly chatbot.' }];

    try {
      await message.channel.sendTyping();

      // Retrieve previous messages in the channel
      let prevMessages = await message.channel.messages.fetch({ limit: 15 });
      prevMessages = prevMessages.array().reverse();

      // Add user messages to the conversation log
      prevMessages.forEach((msg) => {
        if (msg.author.id !== client.user.id && !msg.author.bot) {
          conversationLog.push({
            role: 'user',
            content: msg.content,
          });
        }
      });

      // Add the current message to the conversation log
      conversationLog.push({
        role: 'user',
        content: message.content,
      });

      // Generate AI response using OpenAI API
      const result = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: conversationLog,
      });

      let text = result.data.choices[0].message.content;
      if (text.length > MAX_MESSAGE_LENGTH) {
        text = text.slice(0, MAX_MESSAGE_LENGTH) + '...';
      }

      // Send the AI-generated response
      await message.reply(text);
    } catch (error) {
      console.error('Error:', error);
    }
  }
});

const token = process.env.TOKEN || '';

// Log in to Discord using the bot token
client.login(token);

