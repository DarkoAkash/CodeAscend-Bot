const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to timeout')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Timeout duration (1m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        try {
            const target = interaction.options.getMember('target');
            const duration = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            // Convert duration string to milliseconds
            const durationMs = parseDuration(duration);
            if (!durationMs) {
                return interaction.reply({
                    content: '❌ Invalid duration format! Use format like: 1m, 1h, 1d',
                    ephemeral: true
                });
            }

            // Check if duration is within limits (max 28 days)
            if (durationMs > 28 * 24 * 60 * 60 * 1000) {
                return interaction.reply({
                    content: '❌ Timeout duration cannot exceed 28 days!',
                    ephemeral: true
                });
            }

            // Check permissions
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({
                    content: '❌ I don\'t have permission to timeout members!',
                    ephemeral: true
                });
            }

            if (!target) {
                return interaction.reply({
                    content: '❌ Could not find that member!',
                    ephemeral: true
                });
            }

            // Check if target is moderatable
            if (!target.moderatable) {
                return interaction.reply({
                    content: '❌ I cannot timeout this user! They may have a higher role than me.',
                    ephemeral: true
                });
            }

            // Check if the executor has a higher role than the target
            if (interaction.member.roles.highest.position <= target.roles.highest.position) {
                return interaction.reply({
                    content: '❌ You cannot timeout someone with an equal or higher role!',
                    ephemeral: true
                });
            }

            // Create timeout embed
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⏰ Member Timed Out')
                .setDescription(`**${target.user.tag}** has been timed out.`)
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: '⏱️ Duration', value: formatDuration(durationMs), inline: true },
                    { name: '📅 Until', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:F>`, inline: true },
                    { name: '❌ Reason', value: reason }
                )
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} | Moderation`,
                    iconURL: interaction.guild.iconURL()
                });

            // Create DM embed
            const dmEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle(`You have been timed out in ${interaction.guild.name}`)
                .setDescription(`Your timeout will expire <t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`)
                .addFields(
                    { name: '🛡️ Moderator', value: interaction.user.tag, inline: true },
                    { name: '⏱️ Duration', value: formatDuration(durationMs), inline: true },
                    { name: '❌ Reason', value: reason }
                )
                .setTimestamp();

            // Try to DM the user
            try {
                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Could not DM user ${target.user.tag}`);
                timeoutEmbed.addFields({
                    name: '⚠️ Notice',
                    value: 'Could not send timeout notification to the user.'
                });
            }

            // Apply timeout
            await target.timeout(durationMs, `${interaction.user.tag}: ${reason}`);

            // Send confirmation message
            await interaction.reply({ embeds: [timeoutEmbed] });

            // Log the timeout if there's a mod-logs channel
            const modLogsChannel = interaction.guild.channels.cache.find(
                channel => channel.name === 'logs' || channel.name === 'logs'
            );

            if (modLogsChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⏰ Timeout Log')
                    .setDescription(`A member has been timed out.`)
                    .addFields(
                        { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                        { name: '🛡️ Moderator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                        { name: '⏱️ Duration', value: formatDuration(durationMs), inline: true },
                        { name: '📅 Until', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:F>`, inline: true },
                        { name: '❌ Reason', value: reason }
                    )
                    .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await modLogsChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Error in timeout command:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to timeout the user.',
                ephemeral: true
            });
        }
    }
};

// Helper function to parse duration string to milliseconds
function parseDuration(duration) {
    const match = duration.match(/^(\d+)(m|h|d)$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'm': return value * 60 * 1000;         // minutes
        case 'h': return value * 60 * 60 * 1000;    // hours
        case 'd': return value * 24 * 60 * 60 * 1000; // days
        default: return null;
    }
}

// Helper function to format duration for display
function formatDuration(ms) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    const parts = [];
    if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);

    return parts.join(', ');
}
