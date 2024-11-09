const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('Manage moderation logs')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set the modlog channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel for mod logs')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View recent moderation actions'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'set') {
                const channel = interaction.options.getChannel('channel');
                
                // Check if bot has permissions in the channel
                const botMember = interaction.guild.members.me;
                const channelPermissions = channel.permissionsFor(botMember);

                if (!channelPermissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                    // Try to update channel permissions for the bot
                    try {
                        await channel.permissionOverwrites.edit(botMember, {
                            ViewChannel: true,
                            SendMessages: true,
                            EmbedLinks: true,
                            ReadMessageHistory: true
                        });
                    } catch (error) {
                        return interaction.reply({
                            content: '❌ I don\'t have permission to access this channel. Please give me the necessary permissions or choose a different channel.',
                            ephemeral: true
                        });
                    }
                }

                // Save the channel ID to config
                const configPath = path.join(__dirname, '../../data/modlog-config.json');
                const config = fs.existsSync(configPath) 
                    ? JSON.parse(fs.readFileSync(configPath))
                    : {};

                config[interaction.guild.id] = {
                    channelId: channel.id,
                    permissions: {
                        viewChannel: true,
                        sendMessages: true,
                        embedLinks: true,
                        readMessageHistory: true
                    }
                };

                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Modlog Channel Set')
                    .setDescription(`
                        Moderation logs will now be sent to ${channel}.
                        
                        **Channel Details**
                        > 📝 Channel: ${channel}
                        > 🆔 Channel ID: ${channel.id}
                        > 👤 Set by: ${interaction.user}
                        > 🔒 Permissions: Configured automatically
                    `)
                    .addFields({
                        name: '⚙️ Bot Permissions',
                        value: `
                            > ✅ View Channel
                            > ✅ Send Messages
                            > ✅ Embed Links
                            > ✅ Read Message History
                        `,
                        inline: false
                    })
                    .setTimestamp();

                await interaction.reply({ embeds: [successEmbed] });

            } else if (subcommand === 'view') {
                await interaction.deferReply();

                // Fetch recent mod logs for multiple action types
                const actionTypes = [
                    AuditLogEvent.MemberBanAdd,
                    AuditLogEvent.MemberBanRemove,
                    AuditLogEvent.MemberKick,
                    AuditLogEvent.MemberUpdate,
                    AuditLogEvent.MemberTimeout
                ];

                let allLogs = [];
                for (const actionType of actionTypes) {
                    const logs = await interaction.guild.fetchAuditLogs({
                        limit: 5,
                        type: actionType
                    });
                    allLogs = allLogs.concat(Array.from(logs.entries.values()));
                }

                // Sort logs by timestamp
                allLogs.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
                allLogs = allLogs.slice(0, 10); // Keep only the 10 most recent logs

                const logsEmbed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle('📋 Recent Moderation Actions')
                    .setAuthor({
                        name: interaction.guild.name,
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    });

                if (allLogs.length === 0) {
                    logsEmbed.setDescription('No recent moderation actions found.');
                } else {
                    const logEntries = allLogs.map(log => {
                        const timestamp = `<t:${Math.floor(log.createdTimestamp / 1000)}:R>`;
                        const actionType = this.getActionTypeString(log.action);
                        return `
                            **${actionType}** ${timestamp}
                            > 👤 Target: ${log.target ? log.target.tag : 'Unknown'}
                            > 🛡️ Moderator: ${log.executor.tag}
                            > 📝 Reason: ${log.reason || 'No reason provided'}
                        `;
                    });

                    logsEmbed.setDescription(logEntries.join('\n\n'));
                }

                logsEmbed.setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

                await interaction.editReply({ embeds: [logsEmbed] });
            }

        } catch (error) {
            console.error('Error in modlog command:', error);
            await interaction.reply({
                content: '❌ An error occurred while managing mod logs.',
                ephemeral: true
            });
        }
    },

    getActionTypeString(actionType) {
        const actionTypes = {
            [AuditLogEvent.MemberBanAdd]: '🔨 Ban',
            [AuditLogEvent.MemberBanRemove]: '🔓 Unban',
            [AuditLogEvent.MemberKick]: '👢 Kick',
            [AuditLogEvent.MemberUpdate]: '📝 Update',
            [AuditLogEvent.MemberTimeout]: '⏰ Timeout'
        };
        return actionTypes[actionType] || 'Other Action';
    }
}; 