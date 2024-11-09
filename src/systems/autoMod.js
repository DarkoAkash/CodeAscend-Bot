const { EmbedBuilder } = require('discord.js');

// Store spam detection data
const messageCache = new Map();
const mutedUsers = new Map();

// Default settings (can be overridden by /setspamlimit command)
const defaultSettings = {
    enabled: true,
    messageLimit: 5,
    timeframe: 5000, // 5 seconds
    muteDuration: 5 * 60 * 1000, // 5 minutes
};

// Store server-specific settings
const serverSettings = new Map();

function getSettings(guildId) {
    const settings = serverSettings.get(guildId) || defaultSettings;
    return settings;
}

async function handleMessage(message) {
    if (!message.guild || message.author.bot) return;

    const settings = getSettings(message.guild.id);
    
    // Return early if spam detection is disabled
    if (!settings.enabled) return;

    const key = `${message.author.id}-${message.guild.id}`;
    const now = Date.now();

    // Get user's message history
    let userMessages = messageCache.get(key) || [];
    
    // Remove old messages outside the timeframe
    userMessages = userMessages.filter(timestamp => now - timestamp < settings.timeframe);
    
    // Add current message
    userMessages.push(now);
    messageCache.set(key, userMessages);

    // Check if user is spamming
    if (userMessages.length >= settings.messageLimit) {
        await handleSpam(message, settings);
    }

    // Cleanup old entries every minute
    if (now % 60000 < 1000) {
        cleanupOldMessages();
    }
}

async function handleSpam(message, settings) {
    const { author, guild } = message;
    const key = `${author.id}-${guild.id}`;

    // Check if user is already muted
    if (mutedUsers.get(key)) return;

    try {
        // Find or create muted role
        let mutedRole = guild.roles.cache.find(role => role.name === 'Muted');
        if (!mutedRole) {
            mutedRole = await guild.roles.create({
                name: 'Muted',
                color: '#000000',
                reason: 'Auto-moderation muted role'
            });

            // Set permissions for all channels
            guild.channels.cache.forEach(async (channel) => {
                try {
                    await channel.permissionOverwrites.create(mutedRole, {
                        SendMessages: false,
                        AddReactions: false,
                        Connect: false
                    });
                } catch (error) {
                    console.error(`Error setting permissions for channel ${channel.name}:`, error);
                }
            });
        }

        // Mute the user
        const member = await guild.members.fetch(author.id);
        await member.roles.add(mutedRole);
        mutedUsers.set(key, true);

        // Track for raid detection
        raidTracking.mutedUsers.push(Date.now());
        await checkRaidMode(guild);

        // Adjust mute duration if raid mode is active
        const muteDuration = raidTracking.raidModeActive ? 
            settings.muteDuration * 2 : // Double the mute duration during raids
            settings.muteDuration;

        // Create notification embed
        const spamEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🚫 User Auto-Muted for Spam')
            .setDescription(`${author.tag} has been muted for spam detection.`)
            .addFields(
                { name: 'User', value: `<@${author.id}>`, inline: true },
                { name: 'Action', value: 'Auto-Mute', inline: true },
                { name: 'Duration', value: `${muteDuration / 60000} minutes`, inline: true },
                { name: 'Trigger', value: `${settings.messageLimit} messages in ${settings.timeframe / 1000} seconds` },
                { name: 'Raid Mode', value: raidTracking.raidModeActive ? '🔴 Active' : '🟢 Inactive', inline: true }
            )
            .setTimestamp();

        // Find mod log channel
        const modChannel = guild.channels.cache.find(
            channel => channel.name.includes('mod-log') || channel.name.includes('modlog')
        );

        if (modChannel) {
            await modChannel.send({ embeds: [spamEmbed] });
        }

        // DM the user
        try {
            await author.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('You have been muted')
                        .setDescription(`You have been temporarily muted in ${guild.name} for spam detection.`)
                        .addFields(
                            { name: 'Duration', value: `${muteDuration / 60000} minutes` },
                            { name: 'Reason', value: 'Automated spam detection' }
                        )
                ]
            });
        } catch (error) {
            console.error('Could not DM user:', error);
        }

        // Set timeout to unmute
        setTimeout(async () => {
            try {
                await member.roles.remove(mutedRole);
                mutedUsers.delete(key);

                // Clean up raid tracking
                raidTracking.mutedUsers = raidTracking.mutedUsers.filter(
                    timestamp => Date.now() - timestamp < RAID_TIMEFRAME
                );

                // Notify unmute
                if (modChannel) {
                    await modChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setTitle('User Auto-Unmuted')
                                .setDescription(`${author.tag} has been automatically unmuted.`)
                                .setTimestamp()
                        ]
                    });
                }
            } catch (error) {
                console.error('Error unmuting user:', error);
            }
        }, muteDuration);

    } catch (error) {
        console.error('Error in spam handling:', error);
    }
}

function cleanupOldMessages() {
    const now = Date.now();
    for (const [key, messages] of messageCache.entries()) {
        const settings = getSettings(key.split('-')[1]);
        const validMessages = messages.filter(timestamp => now - timestamp < settings.timeframe);
        if (validMessages.length === 0) {
            messageCache.delete(key);
        } else {
            messageCache.set(key, validMessages);
        }
    }
}

// Add these constants at the top
const RAID_THRESHOLD = 10; // Number of users being muted within timeframe to trigger raid mode
const RAID_TIMEFRAME = 30000; // 30 seconds
const RAID_MODE_DURATION = 10 * 60 * 1000; // 10 minutes
const raidTracking = {
    mutedUsers: [],
    raidModeActive: false,
    raidModeTimeout: null
};

// Add this function to check for raid conditions
async function checkRaidMode(guild) {
    const recentMutes = raidTracking.mutedUsers.filter(
        timestamp => Date.now() - timestamp < RAID_TIMEFRAME
    );

    if (recentMutes.length >= RAID_THRESHOLD && !raidTracking.raidModeActive) {
        // Enable raid mode
        raidTracking.raidModeActive = true;
        
        // Find mod log channel
        const modChannel = guild.channels.cache.find(
            channel => channel.name.includes('mod-log') || channel.name.includes('modlog')
        );

        if (modChannel) {
            const raidAlert = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ RAID MODE ACTIVATED')
                .setDescription('Multiple users have been muted in a short time period.')
                .addFields(
                    { name: 'Muted Users', value: `${recentMutes.length} users in the last 30 seconds` },
                    { name: 'Duration', value: '10 minutes' },
                    { name: 'Auto-Actions', value: '• Increased spam sensitivity\n• New members restricted\n• Auto-mute enabled' }
                )
                .setTimestamp();

            await modChannel.send({
                content: '@here',
                embeds: [raidAlert]
            });
        }

        // Clear raid mode after duration
        if (raidTracking.raidModeTimeout) {
            clearTimeout(raidTracking.raidModeTimeout);
        }

        raidTracking.raidModeTimeout = setTimeout(async () => {
            raidTracking.raidModeActive = false;
            if (modChannel) {
                await modChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setTitle('Raid Mode Deactivated')
                            .setDescription('Server has returned to normal operation.')
                            .setTimestamp()
                    ]
                });
            }
        }, RAID_MODE_DURATION);
    }
}

// Add this function to disable spam detection
function disableSpamDetection(guildId) {
    const currentSettings = serverSettings.get(guildId) || { ...defaultSettings };
    serverSettings.set(guildId, { ...currentSettings, enabled: false });
}

// Export the new functionality
module.exports = {
    handleMessage,
    getSettings,
    setSettings: (guildId, settings) => serverSettings.set(guildId, { ...settings, enabled: true }),
    disableSpamDetection,
    getRaidMode: () => raidTracking.raidModeActive
}; 