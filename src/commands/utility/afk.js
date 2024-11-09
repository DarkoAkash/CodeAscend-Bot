const { SlashCommandBuilder } = require('discord.js');
const { setAfk } = require('../../systems/afkSystem.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set your AFK status')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason you are going AFK')
                .setRequired(false)),

    async execute(interaction) {
        const reason = interaction.options.getString('reason');
        setAfk(interaction.user.id, reason);
        
        await interaction.reply({
            content: `I've set your AFK status${reason ? `: ${reason}` : ''}`,
            ephemeral: true
        });
    },
}; 