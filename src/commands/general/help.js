const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands'),
    
    async execute(interaction, client) {
        try {
            if (!client || !client.commands) {
                throw new Error('Client or commands collection is not properly initialized');
            }

            const embed = new EmbedBuilder()
                .setTitle('📚 Command Guide')
                .setColor('#2F3136')
                .setDescription('Below is a list of all available commands. Use `/command` to execute them.')
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            // Get all command categories (folders)
            const categories = new Map();

            // Safely collect commands into categories
            client.commands.forEach(command => {
                if (!command?.data) return; // Skip if command data is missing
                
                // Get the category from the command's filepath
                const category = command.category || 'General';
                
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                
                categories.get(category).push({
                    name: command.data.name,
                    description: command.data.description
                });
            });

            // Category emojis mapping
            const categoryEmojis = {
                'General': '⚙️',
                'Moderation': '🛡️',
                'Fun': '🎮',
                'Music': '🎵',
                'Utility': '🔧',
                // Add more categories and emojis as needed
            };

            // Add fields for each category
            categories.forEach((commands, category) => {
                const emoji = categoryEmojis[category] || '📌';
                const commandList = commands
                    .map(cmd => `> \`/${cmd.name}\`\n> *${cmd.description}*`)
                    .join('\n\n');

                if (commandList) {
                    embed.addFields({
                        name: `${emoji} ${category.toUpperCase()}`,
                        value: commandList + '\n\u200B' // Add empty line after each category
                    });
                }
            });

            // Add a field with some basic information
            embed.addFields({
                name: '📌 Need Help?',
                value: 'If you need additional help, contact the server administrators.'
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error in help command:', error);
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true
            });
        }
    }
}; 