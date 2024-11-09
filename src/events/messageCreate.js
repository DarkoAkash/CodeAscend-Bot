const { Events } = require('discord.js');
const { isAfk, getAfkInfo } = require('../systems/afkSystem.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        // Check for mentions of AFK users
        message.mentions.users.forEach(async (user) => {
            if (isAfk(user.id)) {
                const afkInfo = getAfkInfo(user.id);
                const timePassed = Math.floor((Date.now() - afkInfo.timestamp) / 1000 / 60);
                
                await message.reply(
                    `${user.username} is currently AFK (${timePassed} minutes ago)\n` +
                    `Reason: ${afkInfo.reason}`
                );
            }
        });
    },
}; 