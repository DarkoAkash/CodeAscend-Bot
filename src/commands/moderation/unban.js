const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The ID of the user to unban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the unban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        try {
            const userId = interaction.options.getString('userid');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            // Check if the bot has permission to unban
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({
                    content: '❌ I don\'t have permission to unban members!',
                    ephemeral: true
                });
            }

            // Fetch ban information
            const banList = await interaction.guild.bans.fetch();
            const bannedUser = banList.get(userId);

            if (!bannedUser) {
                return interaction.reply({
                    content: '❌ This user is not banned from this server!',
                    ephemeral: true
                });
            }

            // Fetch user information
            const user = bannedUser.user;

            // Create unban embed
            const unbanEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔓 Member Unbanned')
                .setDescription(`**${user.tag}** has been unbanned from the server.`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Unbanned User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: '📅 Unban Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '✅ Reason', value: reason },
                    { name: '❌ Previous Ban Reason', value: bannedUser.reason || 'No reason recorded' }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `${interaction.guild.name} | Moderation`, 
                    iconURL: interaction.guild.iconURL() 
                });

            // Try to DM the user about their unban
            try {
                // Create an invite that lasts 24 hours with 1 use
                const invite = await interaction.channel.createInvite({
                    maxAge: 86400,
                    maxUses: 1,
                    unique: true
                });

                const dmEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle(`You have been unbanned from ${interaction.guild.name}`)
                    .setDescription(`You can now rejoin the server using this invite: ${invite.url}\n\nThis invite will expire in 24 hours and can only be used once.`)
                    .addFields(
                        { name: '🛡️ Unbanned by', value: interaction.user.tag, inline: true },
                        { name: '📅 Unban Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '✅ Reason', value: reason },
                        { name: '🔗 Server Invite', value: invite.url }
                    )
                    .setTimestamp()
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

                await user.send({ embeds: [dmEmbed] });
                console.log(`Successfully sent unban notification to ${user.tag}`);
            } catch (error) {
                console.log(`Could not DM user ${user.tag}: ${error.message}`);
                // Add a field to the unban embed to notify moderator
                unbanEmbed.addFields({
                    name: '⚠️ Notice',
                    value: 'Could not send unban notification to the user.'
                });
            }

            // Unban the user
            await interaction.guild.members.unban(user, `${interaction.user.tag}: ${reason}`);

            // Send confirmation message
            await interaction.reply({ embeds: [unbanEmbed] });

            // Log the unban if there's a mod-logs channel
            const modLogsChannel = interaction.guild.channels.cache.find(
                channel => channel.name === 'mod-logs' || channel.name === 'modlogs'
            );

            if (modLogsChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🔓 Unban Log')
                    .setDescription(`A member has been unbanned from the server.`)
                    .addFields(
                        { name: '👤 Unbanned User', value: `${user.tag} (${user.id})`, inline: true },
                        { name: '🛡️ Moderator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                        { name: '📅 Unban Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                        { name: '✅ Unban Reason', value: reason },
                        { name: '❌ Previous Ban Reason', value: bannedUser.reason || 'No reason recorded' }
                    )
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await modLogsChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Error in unban command:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to unban the user.',
                ephemeral: true
            });
        }
    }
}; 