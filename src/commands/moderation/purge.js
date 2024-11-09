const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('target')
                .setDescription('User whose messages to delete')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const amount = interaction.options.getInteger('amount');
            const target = interaction.options.getUser('target');

            // Defer reply since this might take a moment
            await interaction.deferReply({ ephemeral: true });

            // Fetch messages
            const messages = await interaction.channel.messages.fetch({
                limit: 100
            });

            // Filter messages if target is specified
            let filteredMessages = target
                ? messages.filter(msg => msg.author.id === target.id)
                : messages;

            // Limit to the requested amount
            filteredMessages = [...filteredMessages.values()].slice(0, amount);

            // Delete messages
            await interaction.channel.bulkDelete(filteredMessages, true);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🗑️ Messages Purged')
                .setDescription(`
                    Successfully deleted messages.
                    
                    **Purge Details**
                    > 📊 Amount: ${filteredMessages.length} messages
                    ${target ? `> 👤 Target User: ${target.tag}` : ''}
                    > 🛡️ Moderator: ${interaction.user.tag}
                    > 📝 Channel: ${interaction.channel}
                `)
                .setFooter({
                    text: `Action performed by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error in purge command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while trying to delete messages.',
                ephemeral: true
            });
        }
    }
}; 