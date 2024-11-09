const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class LogManager {
    static async sendLog(guild, embed, type = 'mod') {
        try {
            const configPath = path.join(__dirname, '../data/modlog-config.json');
            if (!fs.existsSync(configPath)) return null;

            const config = JSON.parse(fs.readFileSync(configPath));
            const guildConfig = config[guild.id];

            if (!guildConfig?.channelId) return null;

            const channel = await guild.channels.fetch(guildConfig.channelId);
            if (!channel) return null;

            // Check permissions
            const botMember = guild.members.me;
            const permissions = channel.permissionsFor(botMember);

            if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                // Try to fix permissions
                try {
                    await channel.permissionOverwrites.edit(botMember, {
                        ViewChannel: true,
                        SendMessages: true,
                        EmbedLinks: true,
                        ReadMessageHistory: true
                    });
                } catch (error) {
                    console.error('Failed to update channel permissions:', error);
                    return null;
                }
            }

            return await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending log:', error);
            return null;
        }
    }
}

module.exports = LogManager; 