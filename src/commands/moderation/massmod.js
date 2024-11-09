const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('massmod')
        .setDescription('Mass moderation commands for handling raids')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Mass ban users based on criteria')
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the mass ban')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option
                        .setName('account_age')
                        .setDescription('Account age in days (ban accounts newer than this)')
                        .setMinValue(0)
                        .setRequired(false))
                .addIntegerOption(option =>
                    option
                        .setName('join_time')
                        .setDescription('Join time in hours (ban accounts that joined within this time)')
                        .setMinValue(0)
                        .setRequired(false))
                .addBooleanOption(option =>
                    option
                        .setName('no_avatar')
                        .setDescription('Ban users without custom avatars')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Mass kick users based on criteria')
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the mass kick')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option
                        .setName('account_age')
                        .setDescription('Account age in days (kick accounts newer than this)')
                        .setMinValue(0)
                        .setRequired(false))
                .addIntegerOption(option =>
                    option
                        .setName('join_time')
                        .setDescription('Join time in hours (kick accounts that joined within this time)')
                        .setMinValue(0)
                        .setRequired(false))
                .addBooleanOption(option =>
                    option
                        .setName('no_avatar')
                        .setDescription('Kick users without custom avatars')
                        .setRequired(false))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const subcommand = interaction.options.getSubcommand();
            const accountAge = interaction.options.getInteger('account_age');
            const joinTime = interaction.options.getInteger('join_time');
            const noAvatar = interaction.options.getBoolean('no_avatar');
            const reason = interaction.options.getString('reason');

            // Fetch all guild members
            await interaction.guild.members.fetch();

            // Filter members based on criteria
            let targetMembers = interaction.guild.members.cache.filter(member => {
                // Skip bots and moderators
                if (member.user.bot || member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return false;
                }

                // Account age check
                if (accountAge) {
                    const accountAgeMs = Date.now() - member.user.createdTimestamp;
                    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
                    if (accountAgeDays > accountAge) {
                        return false;
                    }
                }

                // Join time check
                if (joinTime) {
                    const joinTimeMs = Date.now() - member.joinedTimestamp;
                    const joinTimeHours = joinTimeMs / (1000 * 60 * 60);
                    if (joinTimeHours > joinTime) {
                        return false;
                    }
                }

                // Avatar check
                if (noAvatar && member.user.avatarURL()) {
                    return false;
                }

                return true;
            });

            if (targetMembers.size === 0) {
                return await interaction.editReply({
                    content: 'No members match the specified criteria.',
                    ephemeral: true
                });
            }

            // Create confirmation embed
            const confirmEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`Mass ${subcommand.toUpperCase()} Confirmation`)
                .setDescription(`You are about to ${subcommand} ${targetMembers.size} members.`)
                .addFields(
                    { name: 'Criteria', value: [
                        accountAge ? `• Account age < ${accountAge} days` : null,
                        joinTime ? `• Joined < ${joinTime} hours ago` : null,
                        noAvatar ? '• No custom avatar' : null
                    ].filter(Boolean).join('\n') || 'No specific criteria' },
                    { name: 'Reason', value: reason },
                    { name: 'Warning', value: 'This action cannot be undone!' }
                )
                .setTimestamp();

            // Log to mod channel
            const modChannel = interaction.guild.channels.cache.find(
                channel => channel.name.includes('mod-log') || channel.name.includes('modlog')
            );

            // Execute moderation action
            let successCount = 0;
            let failCount = 0;
            const errors = [];

            for (const [, member] of targetMembers) {
                try {
                    if (subcommand === 'ban') {
                        await member.ban({ reason: `Mass ban: ${reason}` });
                    } else {
                        await member.kick(`Mass kick: ${reason}`);
                    }
                    successCount++;
                } catch (error) {
                    failCount++;
                    errors.push(`${member.user.tag}: ${error.message}`);
                }

                // Add small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Create result embed
            const resultEmbed = new EmbedBuilder()
                .setColor(successCount > 0 ? 0x00FF00 : 0xFF0000)
                .setTitle(`Mass ${subcommand} Results`)
                .addFields(
                    { name: 'Success', value: `${successCount} members`, inline: true },
                    { name: 'Failed', value: `${failCount} members`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            if (errors.length > 0) {
                resultEmbed.addFields({
                    name: 'Errors',
                    value: errors.slice(0, 10).join('\n') + (errors.length > 10 ? '\n...' : '')
                });
            }

            // Log to mod channel
            if (modChannel) {
                await modChannel.send({ embeds: [resultEmbed] });
            }

            await interaction.editReply({
                embeds: [resultEmbed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in mass moderation command:', error);
            await interaction.editReply({
                content: 'An error occurred while executing the command.',
                ephemeral: true
            });
        }
    },
}; 