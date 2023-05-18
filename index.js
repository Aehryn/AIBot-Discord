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
  console.log('Bot Content:', getBotContent()); // Display the value of BOT_CONTENT

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

// Rest of the code...

client.login(process.env.TOKEN);
