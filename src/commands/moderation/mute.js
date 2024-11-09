const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a member')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to mute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Mute duration (1m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
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

            // Check permissions
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({
                    content: '❌ I don\'t have permission to mute members!',
                    ephemeral: true
                });
            }

            if (!target.moderatable) {
                return interaction.reply({
                    content: '❌ I cannot mute this user! They may have a higher role than me.',
                    ephemeral: true
                });
            }

            // Create mute embed
            const muteEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔇 Member Muted')
                .setDescription(`**${target.user.tag}** has been muted.`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag}`, inline: true },
                    { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: '⏱️ Duration', value: formatDuration(durationMs), inline: true },
                    { name: '📅 Until', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:F>`, inline: true },
                    { name: '❌ Reason', value: reason }
                )
                .setTimestamp();

            // Apply mute
            await target.timeout(durationMs, reason);

            // Send confirmation
            await interaction.reply({ embeds: [muteEmbed] });

            // Try to DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle(`You have been muted in ${interaction.guild.name}`)
                    .addFields(
                        { name: '🛡️ Moderator', value: interaction.user.tag, inline: true },
                        { name: '⏱️ Duration', value: formatDuration(durationMs), inline: true },
                        { name: '❌ Reason', value: reason }
                    )
                    .setTimestamp();

                await target.user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Could not DM user ${target.user.tag}`);
            }

        } catch (error) {
            console.error('Error in mute command:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to mute the user.',
                ephemeral: true
            });
        }
    }
};

function parseDuration(duration) {
    const match = duration.match(/^(\d+)(m|h|d)$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

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
