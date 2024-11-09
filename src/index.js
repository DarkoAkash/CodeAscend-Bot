const { Client, GatewayIntentBits, Collection, REST, Routes, Partials, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();
const mongoose = require('mongoose');
const { updateExistingUsers } = require('./utils/updateUsers');
const { checkEligibility, handleReroll } = require('./utils/giveawayUtils');
const verificationCommand = require('./commands/moderation/setverification');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB!');
        try {
            await updateExistingUsers();
            console.log('Successfully updated existing users');
        } catch (error) {
            console.error('Error updating users:', error);
        }
    })
    .catch((err) => console.error('MongoDB connection error:', err));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction
    ]
});

client.commands = new Collection();
client.giveaways = new Collection();

// Command handling setup
const fs = require('fs');
const path = require('path');

// Command collection setup
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

console.log('\nLoading commands...');

for (const folder of commandFolders) {
    console.log(`\n📁 Loading commands from ${folder} folder...`);
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️ Skipped ${file}: Missing required "data" or "execute" property`);
        }
    }
}

console.log(`\n Total commands loaded: ${commands.length}\n`);

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
            throw new Error('Missing DISCORD_TOKEN or CLIENT_ID in environment variables');
        }

        if (commands.length === 0) {
            console.log('No commands found to register.');
            return;
        }

        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        console.log(`Using Client ID: ${process.env.CLIENT_ID}`);
        
        // First, try to validate the bot token
        try {
            const response = await rest.get(Routes.user('@me'));
            console.log(`Bot user validated: ${response.username}#${response.discriminator}`);
        } catch (error) {
            throw new Error('Invalid bot token provided');
        }

        // Then register commands
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('[ERROR] Error registering slash commands:', error.message);
        if (error.code === 10002) {
            console.error('[HELP] This error usually means either:');
            console.error('1. Your CLIENT_ID is incorrect');
            console.error('2. Your bot token is invalid');
            console.error('3. You haven\'t created a bot user in the Discord Developer Portal');
            console.error('\nPlease check:');
            console.error('1. Your .env file has the correct CLIENT_ID');
            console.error('2. Your bot token is valid and properly copied');
            console.error('3. You\'ve created a bot user in the Discord Developer Portal');
        }
        process.exit(1);
    }
})();

// Handle interactions
client.on('interactionCreate', async (interaction) => {
    try {
        // Handle verification interactions
        if (interaction.isButton() || interaction.isModalSubmit()) {
            await verificationCommand.handleVerification(interaction);
        }

        // Button interactions
        if (interaction.isButton()) {
            const projectCommand = client.commands.get('project');
            if (projectCommand) {
                await projectCommand.handleButtons(interaction);
            }
        }

        // Command interactions
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction, client);
        }
    } catch (error) {
        console.error('[ERROR] Error handling interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            } catch (e) {
                console.error('[ERROR] Could not send error message:', e);
            }
        }
    }
});

const activities = [
    { 
        name: () => `Playing CodeAscend`,
        type: 3 
    }
];

function updateActivity() {
    const activity = activities[Math.floor(Math.random() * activities.length)];
    const name = typeof activity.name === 'function' ? activity.name() : activity.name;
    
    client.user.setPresence({
        activities: [{ name, type: activity.type }],
        status: 'dnd'
    });
}

// Optional: Add status rotation too
const statuses = ['online', 'idle', 'dnd'];
let statusIndex = 0;

function updateStatus() {
    client.user.setStatus(statuses[statusIndex]);
    statusIndex = (statusIndex + 1) % statuses.length;
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Set initial activity and status
    updateActivity();
    updateStatus();
    
    // Update activity every 10 minutes
    setInterval(updateActivity, 10 * 60 * 1000);
    
    // Update status every 30 minutes
    setInterval(updateStatus, 30 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);

// Add this with your other event handlers
client.on('guildMemberAdd', async (member) => {
    try {
        console.log(`New member joined: ${member.user.tag}`);
        
        // Check if the welcome channel exists
        const welcomeChannel = member.guild.channels.cache.find(
            channel => channel.name.toLowerCase() === 'joins' || 
                      channel.name.toLowerCase() === 'welcome' ||
                      channel.name.toLowerCase() === 'welcomes'
        );

        if (!welcomeChannel) {
            console.log(`No welcome channel found in ${member.guild.name}`);
            // Create a welcome channel if it doesn't exist
            try {
                const createdChannel = await member.guild.channels.create({
                    name: 'joins',
                    type: 0, // Text channel
                    topic: 'Welcome new members!',
                    reason: 'Created for welcome messages'
                });
                console.log(`Created welcome channel: ${createdChannel.name}`);
            } catch (error) {
                console.error('Error creating welcome channel:', error);
            }
        }

        // Execute the welcome message
        await require('./events/guildMemberAdd').execute(member);
    } catch (error) {
        console.error('Error handling new member:', error);
    }
});

// Add these requires at the top
const autoMod = require('./systems/autoMod');

// Add this event handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Comment out leveling system for now
    // await levelSystem.handleMessage(message);

    // Handle auto-moderation
    await autoMod.handleMessage(message);
});
