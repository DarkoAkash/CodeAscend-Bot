const { SlashCommandBuilder, EmbedBuilder, version: discordJSVersion } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Shows bot\'s latency and system information'),

    async execute(interaction) {
        // Initial response
        const initialEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🏓 Pinging...')
            .setDescription('Calculating ping and fetching system information...')
            .setTimestamp();

        const sent = await interaction.reply({ 
            embeds: [initialEmbed], 
            fetchReply: true 
        });

        // Calculate various latencies
        const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const websocketLatency = interaction.client.ws.ping;
        const apiLatency = Math.round(interaction.client.rest.ping);

        // Get system information
        const totalMemory = Math.round(os.totalmem() / 1024 / 1024);
        const usedMemory = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        // Format uptime
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Create latency status indicators
        const getLatencyStatus = (ping) => {
            if (ping < 100) return '🟢 Excellent';
            if (ping < 200) return '🟡 Good';
            if (ping < 400) return '🟠 Moderate';
            return '🔴 High';
        };

        // Create the final embed
        const finalEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏓 Pong!')
            .setDescription('Here\'s your detailed ping information and system stats.')
            .addFields(
                {
                    name: '📊 Latency Information',
                    value: [
                        `**Roundtrip:** ${roundtripLatency}ms ${getLatencyStatus(roundtripLatency)}`,
                        `**WebSocket:** ${websocketLatency}ms ${getLatencyStatus(websocketLatency)}`,
                        `**API:** ${apiLatency}ms ${getLatencyStatus(apiLatency)}`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💻 System Information',
                    value: [
                        `**Platform:** ${process.platform}`,
                        `**Node.js:** ${process.version}`,
                        `**Discord.js:** v${discordJSVersion}`,
                        `**CPU:** ${os.cpus()[0].model}`,
                        `**Cores:** ${os.cpus().length}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📈 Memory Usage',
                    value: [
                        `**System Total:** ${totalMemory}MB`,
                        `**System Used:** ${usedMemory}MB`,
                        `**Bot Heap:** ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                        `**Bot RSS:** ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⏰ Uptime',
                    value: `Bot has been online for: **${uptimeString}**`,
                    inline: false
                }
            )
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();

        // Edit the initial response with the final embed
        await interaction.editReply({ embeds: [finalEmbed] });
    },
};
