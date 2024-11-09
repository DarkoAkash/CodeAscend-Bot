const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a member')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to unmute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unmute')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        try {
            const target = interaction.options.getMember('target');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            if (!target.isCommunicationDisabled()) {
                return interaction.reply({
                    content: '❌ This user is not muted!',
                    ephemeral: true
                });
            }

            // Create unmute embed
            const unmuteEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔊 Member Unmuted')
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setDescription(`
                    ${target.user} has been unmuted.
                    
                    **Unmute Details**
                    > 👤 User: ${target.user.tag}
                    > 🛡️ Moderator: ${interaction.user.tag}
                    > ✅ Reason: ${reason}
                `)
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .setFooter({
                    text: `Moderator: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Remove timeout
            await target.timeout(null, reason);

            // Send confirmation
            await interaction.reply({ embeds: [unmuteEmbed] });

            // Try to DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(`You have been unmuted in ${interaction.guild.name}`)
                    .setDescription(`
                        **Unmute Details**
                        > 🛡️ Unmuted by: ${interaction.user.tag}
                        > ✅ Reason: ${reason}
                    `)
                    .setTimestamp();

                await target.user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Could not DM user ${target.user.tag}`);
            }

        } catch (error) {
            console.error('Error in unmute command:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to unmute the user.',
                ephemeral: true
            });
        }
    }
}; 