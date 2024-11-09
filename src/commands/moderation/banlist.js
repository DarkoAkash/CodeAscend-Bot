const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('View all banned users')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const bans = await interaction.guild.bans.fetch();
            if (bans.size === 0) {
                return interaction.editReply({
                    content: '✅ There are no banned users in this server.',
                    ephemeral: true
                });
            }

            const banListEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔨 Server Ban List')
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setDescription(`Total Bans: ${bans.size}`)
                .setTimestamp();

            // Create fields for each ban, grouped by 25 due to embed limits
            const banGroups = [];
            let currentGroup = [];
            
            bans.forEach((ban) => {
                currentGroup.push(`👤 **${ban.user.tag}** (${ban.user.id})\n📝 Reason: ${ban.reason || 'No reason provided'}`);
                
                if (currentGroup.length === 25) {
                    banGroups.push([...currentGroup]);
                    currentGroup = [];
                }
            });
            
            if (currentGroup.length > 0) {
                banGroups.push(currentGroup);
            }

            // Send initial embed
            const firstPageEmbed = banListEmbed.addFields({
                name: 'Banned Users',
                value: banGroups[0].join('\n\n')
            });

            await interaction.editReply({ embeds: [firstPageEmbed] });

            // If there are more pages, send them as follow-up messages
            for (let i = 1; i < banGroups.length; i++) {
                const pageEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`🔨 Ban List (Continued ${i + 1}/${banGroups.length})`)
                    .addFields({
                        name: 'Banned Users',
                        value: banGroups[i].join('\n\n')
                    });

                await interaction.followUp({ embeds: [pageEmbed] });
            }

        } catch (error) {
            console.error('Error in banlist command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching the ban list.',
                ephemeral: true
            });
        }
    }
}; 