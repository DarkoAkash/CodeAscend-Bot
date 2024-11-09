const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');

const ENTRY_COOLDOWN = 5000; // 5 seconds cooldown between entry attempts
const MIN_ACCOUNT_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days minimum account age
const MIN_SERVER_TIME = 24 * 60 * 60 * 1000; // 1 day minimum server time
const WINNER_RESPONSE_TIME = 24 * 60 * 60 * 1000; // 24 hours to respond

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What is the prize?')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('How long should the giveaway last? (1m, 1h, 1d)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('How many winners?')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addRoleOption(option =>
                    option.setName('required_role')
                        .setDescription('Role required to enter the giveaway')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('start_time')
                        .setDescription('When to start the giveaway (e.g., 2h, tomorrow, 9pm)')
                        .setRequired(false))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Which channel to host the giveaway in?')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('dm_winners')
                        .setDescription('Whether to DM winners when they win')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('reminders')
                        .setDescription('Send reminder messages before end')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID of the giveaway')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll a giveaway')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The message ID of the giveaway')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active giveaways')),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'start':
                    await handleStart(interaction);
                    break;
                case 'end':
                    await handleEnd(interaction);
                    break;
                case 'reroll':
                    await handleReroll(interaction);
                    break;
                case 'list':
                    await handleList(interaction);
                    break;
                default:
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: 'Invalid subcommand!',
                            ephemeral: true
                        });
                    }
            }
        } catch (error) {
            console.error('[ERROR] Error in giveaway command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            }
        }
    }
};

async function handleStart(interaction) {
    try {
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getString('duration');
        const winnerCount = interaction.options.getInteger('winners');
        const requiredRole = interaction.options.getRole('required_role');
        const startTime = interaction.options.getString('start_time');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const dmWinners = interaction.options.getBoolean('dm_winners') ?? true;
        const sendReminders = interaction.options.getBoolean('reminders') ?? true;

        const msTime = ms(duration);
        if (!msTime) {
            return interaction.reply({
                content: 'Please provide a valid duration format (e.g., 1m, 1h, 1d)!',
                ephemeral: true
            });
        }

        let startDelay = 0;
        if (startTime) {
            startDelay = ms(startTime);
            if (!startDelay) {
                return interaction.reply({
                    content: 'Invalid start time format!',
                    ephemeral: true
                });
            }
        }

        const startTimestamp = Date.now() + startDelay;
        const endTime = startTimestamp + msTime;

        const giveawayEmbed = new EmbedBuilder()
            .setTitle('🎉 New Giveaway')
            .setDescription(`
                **Prize:** ${prize}
                **Winners:** ${winnerCount}
                ${startDelay ? `**Starts:** <t:${Math.floor(startTimestamp / 1000)}:R>\n` : ''}
                **Ends:** <t:${Math.floor(endTime / 1000)}:R>
                ${requiredRole ? `**Required Role:** ${requiredRole}` : ''}

                **How to Enter:**
                • Click the Enter button below
                • Meet the eligibility requirements
                • Wait for the results

                ${requiredRole ? `\n**Requirements:**\n• Have the ${requiredRole} role\n• Account age: 7 days\n• Server time: 24 hours` : ''}
            `)
            .setColor(getRandomColor())
            .setTimestamp(endTime)
            .setFooter({ 
                text: `Hosted by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }));

        const enterButton = new ButtonBuilder()
            .setCustomId('giveaway-enter')
            .setLabel('Enter Giveaway! 🎉')
            .setStyle(ButtonStyle.Primary);

        const leaveButton = new ButtonBuilder()
            .setCustomId('giveaway-leave')
            .setLabel('Leave Giveaway')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(enterButton, leaveButton);

        const message = await channel.send({
            embeds: [giveawayEmbed],
            components: [row]
        });

        const giveawayData = {
            messageId: message.id,
            channelId: channel.id,
            guildId: interaction.guildId,
            prize,
            winnerCount,
            endTime,
            startTime: startTimestamp,
            requiredRoleId: requiredRole?.id,
            participants: new Set(),
            ended: false,
            hostId: interaction.user.id,
            dmWinners,
            sendReminders,
            remindersSent: new Set(),
            entryCooldowns: new Map(), // Track entry cooldowns
            winnerResponseDeadline: null,
            rerollCount: 0,
            maxRerolls: 3, // Maximum number of automatic rerolls
        };

        interaction.client.giveaways.set(message.id, giveawayData);

        // Schedule start if delayed
        if (startDelay > 0) {
            setTimeout(() => startGiveaway(message.id, interaction.client), startDelay);
        }

        // Schedule reminders
        if (sendReminders) {
            scheduleReminders(message.id, interaction.client, msTime);
        }

        // Schedule end
        setTimeout(() => endGiveaway(message.id, interaction.client), startDelay + msTime);

        return interaction.reply({
            content: `Giveaway ${startDelay ? 'scheduled' : 'started'} in ${channel}!`,
            ephemeral: true
        });

    } catch (error) {
        console.error(error);
        return interaction.reply({
            content: 'There was an error while creating the giveaway!',
            ephemeral: true
        });
    }
}

async function startGiveaway(messageId, client) {
    const giveaway = client.giveaways.get(messageId);
    if (!giveaway) return;

    const channel = await client.channels.fetch(giveaway.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId);
    if (!message) return;

    const startEmbed = EmbedBuilder.from(message.embeds[0])
        .setDescription(message.embeds[0].description.replace('**Starts:**', '~~**Starts:**~~') + '\n\n**Giveaway is now LIVE!**');

    await message.edit({ embeds: [startEmbed] });
    await channel.send('🎉 The giveaway has started! Click the button to enter!');
}

async function scheduleReminders(messageId, client, duration) {
    const reminderTimes = [
        { time: Math.min(duration - ms('1d'), duration * 0.75), message: '1 day' },
        { time: Math.min(duration - ms('1h'), duration * 0.9), message: '1 hour' },
        { time: Math.min(duration - ms('5m'), duration * 0.95), message: '5 minutes' }
    ];

    for (const reminder of reminderTimes) {
        if (reminder.time > 0) {
            setTimeout(() => sendReminder(messageId, client, reminder.message), reminder.time);
        }
    }
}

async function sendReminder(messageId, client, timeLeft) {
    const giveaway = client.giveaways.get(messageId);
    if (!giveaway || giveaway.ended || giveaway.remindersSent.has(timeLeft)) return;

    const channel = await client.channels.fetch(giveaway.channelId);
    if (!channel) return;

    await channel.send({
        content: `🎉 **Giveaway Reminder!**\nThe giveaway for **${giveaway.prize}** ends in **${timeLeft}**!\nDon't forget to enter!`,
        reply: { messageReference: messageId }
    });

    giveaway.remindersSent.add(timeLeft);
    client.giveaways.set(messageId, giveaway);
}

async function handleEnd(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = interaction.client.giveaways.get(messageId);

    if (!giveaway) {
        return interaction.reply({
            content: 'Could not find a giveaway with that message ID!',
            ephemeral: true
        });
    }

    if (giveaway.ended) {
        return interaction.reply({
            content: 'This giveaway has already ended!',
            ephemeral: true
        });
    }

    await endGiveaway(messageId, interaction.client);
    await interaction.reply({
        content: 'Giveaway ended successfully!',
        ephemeral: true
    });
}

async function handleReroll(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = interaction.client.giveaways.get(messageId);

    if (!giveaway || !giveaway.ended) {
        return interaction.reply({
            content: 'Could not find an ended giveaway with that message ID!',
            ephemeral: true
        });
    }

    const channel = await interaction.client.channels.fetch(giveaway.channelId);
    if (!channel) return;

    const participants = Array.from(giveaway.participants);
    if (participants.length === 0) {
        return interaction.reply({
            content: 'There were no participants in this giveaway!',
            ephemeral: true
        });
    }

    const winner = participants[Math.floor(Math.random() * participants.length)];
    await channel.send({
        content: `🎉 New winner for **${giveaway.prize}**: <@${winner}>!`,
        allowedMentions: { users: [winner] }
    });

    await interaction.reply({
        content: 'Successfully rerolled the giveaway!',
        ephemeral: true
    });
}

async function handleList(interaction) {
    const activeGiveaways = Array.from(interaction.client.giveaways.values())
        .filter(g => !g.ended && g.guildId === interaction.guildId);

    if (activeGiveaways.length === 0) {
        return interaction.reply({
            content: 'There are no active giveaways in this server!',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('Active Giveaways')
        .setColor('#FF1493')
        .setDescription(
            activeGiveaways.map(g => 
                `**Prize:** ${g.prize}\n**Winners:** ${g.winnerCount}\n**Ends:** <t:${Math.floor(g.endTime / 1000)}:R>\n**Message ID:** ${g.messageId}\n`
            ).join('\n')
        );

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

async function endGiveaway(messageId, client) {
    const giveaway = client.giveaways.get(messageId);
    if (!giveaway || giveaway.ended) return;

    const channel = await client.channels.fetch(giveaway.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId);
    if (!message) return;

    const participants = Array.from(giveaway.participants);
    const winners = [];
    
    for (let i = 0; i < Math.min(giveaway.winnerCount, participants.length); i++) {
        const winner = participants[Math.floor(Math.random() * participants.length)];
        winners.push(winner);
        participants.splice(participants.indexOf(winner), 1);
    }

    // Create a fancy winner announcement embed
    const winnerEmbed = new EmbedBuilder()
        .setTitle('Giveaway Ended')
        .setColor('#FFD700')
        .setDescription(`
            **Prize:** ${giveaway.prize}

            **Winners:**
            ${winners.length > 0 
                ? winners.map(id => `• <@${id}>`).join('\n')
                : '• No winners (no participants)'}

            **Statistics:**
            • Total Entries: ${participants.length}
            • Duration: ${formatDuration(giveaway.endTime - giveaway.startTime)}
            • Host: <@${giveaway.hostId}>
        `)
        .setTimestamp()
        .setFooter({ 
            text: winners.length > 0 ? 'Congratulations to the winners!' : 'Better luck next time!',
            iconURL: channel.guild.iconURL()
        })
        .setThumbnail(channel.guild.iconURL({ dynamic: true, size: 256 }));

    // Update the original giveaway message
    await message.edit({
        embeds: [winnerEmbed],
        components: [] // Remove buttons
    });

    // Send winner notification without pinging
    if (winners.length > 0) {
        const notificationEmbed = new EmbedBuilder()
            .setTitle('Giveaway Results')
            .setDescription(`
                The giveaway for **${giveaway.prize}** has ended.
                
                ${winners.length > 0 
                    ? '**Winners have been chosen!**\nCheck the original message to see if you won.'
                    : 'Unfortunately, there were no participants in this giveaway.'}
            `)
            .setColor('#FFD700')
            .setTimestamp();

        await channel.send({ embeds: [notificationEmbed] });

        // DM winners if enabled
        if (giveaway.dmWinners) {
            for (const winnerId of winners) {
                try {
                    const user = await client.users.fetch(winnerId);
                    await user.send({
                        embeds: [new EmbedBuilder()
                            .setTitle('You Won!')
                            .setDescription(`
                                Congratulations! You won the giveaway in **${channel.guild.name}**!

                                **Prize Details:**
                                • Prize: ${giveaway.prize}
                                • Host: <@${giveaway.hostId}>

                                **Next Steps:**
                                • Contact the host within 24 hours
                                • Provide your information as requested
                                • Claim your prize

                                Note: Failure to respond within 24 hours may result in reroll.
                            `)
                            .setColor('#FFD700')
                            .setTimestamp()
                            .setFooter({ 
                                text: channel.guild.name,
                                iconURL: channel.guild.iconURL()
                            })]
                    });
                } catch (error) {
                    console.error(`Failed to DM winner ${winnerId}:`, error);
                }
            }
        }
    }

    giveaway.ended = true;
    client.giveaways.set(messageId, giveaway);
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

function getRandomColor() {
    const colors = [
        '#2f3136', // Discord Dark
        '#5865F2', // Discord Blurple
        '#57F287', // Discord Green
        '#FEE75C', // Discord Yellow
        '#EB459E', // Discord Fuchsia
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

async function checkWinnerResponse(messageId, client, adminMessage) {
    const giveaway = client.giveaways.get(messageId);
    if (!giveaway || !giveaway.winnerResponseDeadline) return;

    if (Date.now() >= giveaway.winnerResponseDeadline && giveaway.rerollCount < giveaway.maxRerolls) {
        const channel = await client.channels.fetch(giveaway.channelId);
        if (!channel) return;

        // Update admin message with auto-reroll notification
        const rerollEmbed = new EmbedBuilder()
            .setTitle('⚠️ Winner Response Timeout')
            .setDescription(`
                The winner(s) did not respond within 24 hours.
                Automatic reroll will occur in 10 minutes unless cancelled.
            `)
            .setColor('#FFA500')
            .setTimestamp();

        const cancelButton = new ButtonBuilder()
            .setCustomId(`giveaway-cancel-reroll-${messageId}`)
            .setLabel('Cancel Auto-reroll')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(cancelButton);

        await adminMessage.edit({
            embeds: [rerollEmbed],
            components: [row]
        });

        // Schedule automatic reroll after 10 minutes
        setTimeout(async () => {
            const updatedGiveaway = client.giveaways.get(messageId);
            if (updatedGiveaway && !updatedGiveaway.rerollCancelled) {
                await handleReroll({ client, messageId });
                updatedGiveaway.rerollCount++;
                client.giveaways.set(messageId, updatedGiveaway);
            }
        }, 10 * 60 * 1000);
    }
}

async function checkEligibility(member, interaction) {
    const now = Date.now();
    
    // Check account age
    if (now - member.user.createdTimestamp < MIN_ACCOUNT_AGE) {
        const days = Math.ceil(MIN_ACCOUNT_AGE / (24 * 60 * 60 * 1000));
        return `Your account must be at least ${days} days old to enter giveaways.`;
    }

    // Check server join date
    if (now - member.joinedTimestamp < MIN_SERVER_TIME) {
        const days = Math.ceil(MIN_SERVER_TIME / (24 * 60 * 60 * 1000));
        return `You must be in the server for at least ${days} day(s) to enter giveaways.`;
    }

    // Check cooldown
    const giveaway = interaction.client.giveaways.get(interaction.message.id);
    const lastEntry = giveaway.entryCooldowns.get(member.id);
    if (lastEntry && now - lastEntry < ENTRY_COOLDOWN) {
        const remaining = Math.ceil((ENTRY_COOLDOWN - (now - lastEntry)) / 1000);
        return `Please wait ${remaining} seconds before trying to enter again.`;
    }

    return null; // No eligibility issues
} 