const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const LogManager = require('../../utils/logManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the ban')
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        try {
            const target = interaction.options.getUser('target');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const deleteDays = interaction.options.getNumber('days') || 0;

            // Check if the bot has permission to ban
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({
                    content: '❌ I don\'t have permission to ban members!',
                    ephemeral: true
                });
            }

            const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);

            // Check if member exists and is bannable
            if (targetMember) {
                if (!targetMember.bannable) {
                    return interaction.reply({
                        content: '❌ I cannot ban this user! They may have a higher role than me.',
                        ephemeral: true
                    });
                }

                // Check if the target has a higher role than the moderator
                if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
                    return interaction.reply({
                        content: '❌ You cannot ban someone with an equal or higher role!',
                        ephemeral: true
                    });
                }
            }

            // Create ban embed
            const banEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔨 Member Banned')
                .setDescription(`**${target.tag}** has been banned from the server.`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Banned User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: '📅 Ban Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '❌ Reason', value: reason },
                    { name: '🗑️ Message Deletion', value: `${deleteDays} days of messages deleted` }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `${interaction.guild.name} | Moderation`, 
                    iconURL: interaction.guild.iconURL() 
                });

            // Create DM embed
            const dmEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`You have been banned from ${interaction.guild.name}`)
                .addFields(
                    { name: '🛡️ Banned by', value: interaction.user.tag, inline: true },
                    { name: '📅 Ban Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '❌ Reason', value: reason }
                )
                .setTimestamp();

            // Try to DM the user before banning
            try {
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Could not DM user ${target.tag}`);
            }

            // Ban the user
            await interaction.guild.members.ban(target, {
                reason: `${interaction.user.tag}: ${reason}`,
                deleteMessageSeconds: deleteDays * 24 * 60 * 60 // Convert days to seconds
            });

            // Send confirmation message
            await interaction.reply({ embeds: [banEmbed] });

            // Log the ban if there's a mod-logs channel
            await LogManager.sendLog(interaction.guild, banEmbed);

        } catch (error) {
            console.error('Error in ban command:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to ban the user.',
                ephemeral: true
            });
        }
    }
};
