const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const autoMod = require('../../systems/autoMod');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setspamlimit')
        .setDescription('Configure spam detection settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable and configure spam detection')
                .addIntegerOption(option =>
                    option
                        .setName('messages')
                        .setDescription('Number of messages that trigger spam detection')
                        .setRequired(true)
                        .setMinValue(2)
                        .setMaxValue(20))
                .addIntegerOption(option =>
                    option
                        .setName('seconds')
                        .setDescription('Timeframe in seconds')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(60))
                .addIntegerOption(option =>
                    option
                        .setName('mutetime')
                        .setDescription('Mute duration in minutes')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440))) // Max 24 hours
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable spam detection for this server')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'disable') {
            autoMod.disableSpamDetection(interaction.guildId);
            await interaction.reply({
                content: '✅ Spam detection has been disabled for this server.',
                ephemeral: true
            });
            return;
        }

        // Handle enable subcommand
        const messages = interaction.options.getInteger('messages');
        const seconds = interaction.options.getInteger('seconds');
        const muteTime = interaction.options.getInteger('mutetime');

        const settings = {
            enabled: true,
            messageLimit: messages,
            timeframe: seconds * 1000,
            muteDuration: muteTime * 60 * 1000
        };

        autoMod.setSettings(interaction.guildId, settings);

        await interaction.reply({
            content: `Spam detection configured:\n` +
                    `• ${messages} messages in ${seconds} seconds will trigger a mute\n` +
                    `• Mute duration: ${muteTime} minutes`,
            ephemeral: true
        });
    },
}; 