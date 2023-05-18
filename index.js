require('dotenv/config');
const { Client, IntentsBitField, Collection } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.commands = new Collection(); // Create a new collection for slash commands

// Load slash commands
const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.on('ready', () => {
  console.log('The bot is online!');

  // Register the slash command
  const data = {
    name: 'ping',
    description: 'Ping command',
  };
  const guildId = '176230054777323520'; // Replace with your guild ID

  client.guilds.cache.get(guildId)?.commands.create(data);
});

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});

const openai = new OpenAIApi(configuration);

const getBotContent = () => {
  // Retrieve bot content from environment variable
  return process.env.BOT_CONTENT;
};

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith('!')) return;

  try {
    await message.channel.sendTyping();
    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages = Array.from(prevMessages.values()).reverse();

    let conversationLog = prevMessages.map((msg) => {
      const role = msg.author.id === client.user.id ? 'assistant' : 'user';
      const content = msg.content;
      const name = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

      return { role, content, name };
    });

    conversationLog.push({ role: 'user', content: message.content });

    const result = await openai
      .createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: getBotContent() }, ...conversationLog],
      })
      .catch((error) => {
        console.log(`OPENAI ERR: ${error}`);
      });

    const response = result.data.choices[0].message.content;
    if (response) {
      message.reply(response);
    } else {
      console.log('Empty response received from OpenAI API.');
    }
  } catch (error) {
    console.log(`ERR: ${error}`);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    client.commands.get('ping').execute(interaction);
  }
});

client.login(process.env.TOKEN);
