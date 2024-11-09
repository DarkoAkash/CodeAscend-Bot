const { SlashCommandBuilder } = require('discord.js');
const { removeAfk, isAfk } = require('../../systems/afkSystem.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('back')
        .setDescription('Remove your AFK status'),

    async execute(interaction) {
        if (!isAfk(interaction.user.id)) {
            return interaction.reply({
                content: "You weren't AFK!",
                ephemeral: true
            });
        }

        removeAfk(interaction.user.id);
        await interaction.reply({
            content: 'Welcome back! I\'ve removed your AFK status.',
            ephemeral: true
        });
    },
}; 