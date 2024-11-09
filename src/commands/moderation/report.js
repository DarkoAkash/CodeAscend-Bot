const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report a user for breaking rules')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to report')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the report')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('evidence')
                .setDescription('Any evidence (message links, screenshots, etc.)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const target = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const evidence = interaction.options.getString('evidence') || 'No evidence provided';

            // Create report embed
            const reportEmbed = new EmbedBuilder()
                .setColor('#FF9900')
                .setTitle('⚠️ New User Report')
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setDescription(`
                    A user has been reported to the moderators.
                    
                    **Report Details**
                    > 👤 Reported User: ${target} (${target.tag})
                    > 📝 Reason: ${reason}
                    > 🔍 Evidence: ${evidence}
                    > 🚨 Reporter: ${interaction.user} (${interaction.user.tag})
                `)
                .addFields(
                    {
                        name: '📅 Time of Report',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    },
                    {
                        name: '📍 Channel',
                        value: `${interaction.channel}`,
                        inline: true
                    }
                )
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setFooter({
                    text: 'Report ID: ' + Date.now().toString(36),
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            // Find mod log channel
            const configPath = path.join(__dirname, '../../data/modlog-config.json');
            const config = fs.existsSync(configPath)
                ? JSON.parse(fs.readFileSync(configPath))
                : {};

            const modChannel = interaction.guild.channels.cache.get(config[interaction.guild.id]);

            if (modChannel) {
                await modChannel.send({ embeds: [reportEmbed] });
            }

            // Send confirmation to user
            const confirmEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Report Submitted')
                .setDescription(`
                    Your report has been submitted to the moderators.
                    
                    **Report Summary**
                    > 👤 Reported: ${target.tag}
                    > 📝 Reason: ${reason}
                    
                    The moderators will review your report shortly.
                `)
                .setFooter({
                    text: 'Thank you for helping keep the server safe!',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error in report command:', error);
            await interaction.reply({
                content: '❌ An error occurred while submitting the report.',
                ephemeral: true
            });
        }
    }
}; 