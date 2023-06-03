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

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});

const openai = new OpenAIApi(configuration);

const getBotContent = () => {
  // Retrieve bot content from environment variable
  return process.env.BOT_CONTENT;
};

let lastInteractionTime = 0; // Variable to track the time of the last API interaction
const interactionCooldown = 5000; // Cooldown time in milliseconds (adjust as needed)

const rateLimitedReply = async (message) => {
  const timeSinceLastInteraction = Date.now() - lastInteractionTime;
  const remainingCooldown = interactionCooldown - timeSinceLastInteraction;

  if (remainingCooldown > 0) {
    // Cooldown still active, reply with a message indicating the remaining cooldown time
    const remainingSeconds = Math.ceil(remainingCooldown / 1000);
    message.reply(`Please wait ${remainingSeconds} seconds before sending another message.`);
    return;
  }

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

    const result = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: getBotContent() }, ...conversationLog],
    });

    const response = result.data.choices[0].message.content;
    if (response) {
      message.reply(response);
    } else {
      console.log('Empty response received from OpenAI API.');
    }
  } catch (error) {
    console.log(`OPENAI ERR: ${error}`);
  }

  lastInteractionTime = Date.now(); // Update the last interaction time
};

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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith('!')) return;

  rateLimitedReply(message);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    client.commands.get('ping').execute(interaction);
  }
});

client.login(process.env.TOKEN);
