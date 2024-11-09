const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for kicking')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        // Check if the bot can kick the target
        if (!target.kickable) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error: Cannot Kick Member')
                .setDescription('I do not have permission to kick this user.')
                .addFields({ 
                    name: 'Possible Reasons', 
                    value: '• Target has higher roles than bot\n• Bot lacks kick permissions\n• Target is the server owner' 
                })
                .setFooter({ text: 'Action Failed' })
                .setTimestamp();

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if the user trying to kick has a higher role than the target
        if (interaction.member.roles.highest.position <= target.roles.highest.position) {
            const permissionEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permission Error')
                .setDescription('You cannot kick this user!')
                .addFields({ 
                    name: 'Reason', 
                    value: 'Target has higher or equal role hierarchy position.' 
                })
                .setFooter({ text: 'Action Failed' })
                .setTimestamp();

            return interaction.reply({ embeds: [permissionEmbed], ephemeral: true });
        }

        try {
            // Create a DM embed to notify the kicked user
            const dmEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle(`You've been kicked from ${interaction.guild.name}`)
                .setDescription('You can rejoin the server with a new invite link.')
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Kicked By', value: interaction.user.tag }
                )
                .setTimestamp();

            // Try to DM the user before kicking
            try {
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Could not DM user ${target.user.tag}`);
            }

            // Kick the user
            await target.kick(reason);

            // Create the success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('👢 Member Kicked')
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`**${target.user.tag}** has been kicked from the server.`)
                .addFields(
                    { 
                        name: '👤 User Information', 
                        value: [
                            `**• Username:** ${target.user.tag}`,
                            `**• ID:** ${target.user.id}`,
                            `**• Joined At:** <t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,
                        ].join('\n'),
                        inline: false
                    },
                    { 
                        name: '🛡️ Moderator', 
                        value: [
                            `**• Username:** ${interaction.user.tag}`,
                            `**• ID:** ${interaction.user.id}`,
                        ].join('\n'),
                        inline: true
                    },
                    { 
                        name: '📝 Reason', 
                        value: reason,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Moderator: ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();

            // Send the success embed
            await interaction.reply({ embeds: [successEmbed] });

            // Optional: Log the kick in a logging channel
            const logChannel = interaction.guild.channels.cache.find(
                channel => channel.name === 'logs'
            );

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('📋 Moderation Log: Member Kicked')
                    .addFields(
                        { name: 'Action', value: 'Kick', inline: true },
                        { name: 'Target', value: target.user.tag, inline: true },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Reason', value: reason }
                    )
                    .setFooter({ text: `User ID: ${target.user.id}` })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while trying to kick the member.')
                .addFields({ 
                    name: 'Error Details', 
                    value: error.message || 'Unknown error' 
                })
                .setFooter({ text: 'Action Failed' })
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
