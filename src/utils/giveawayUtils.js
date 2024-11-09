const ENTRY_COOLDOWN = 5000; // 5 seconds cooldown between entry attempts
const MIN_ACCOUNT_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days minimum account age
const MIN_SERVER_TIME = 24 * 60 * 60 * 1000; // 1 day minimum server time

async function checkEligibility(member, interaction) {
    const now = Date.now();
    
    // Check account age
    if (now - member.user.createdTimestamp < MIN_ACCOUNT_AGE) {
        const days = Math.ceil(MIN_ACCOUNT_AGE / (24 * 60 * 60 * 1000));
        return `Your account must be at least ${days} days old to enter giveaways.`;
    }

    // Check server join date
    if (now - member.joinedTimestamp < MIN_SERVER_TIME) {
        const days = Math.ceil(MIN_SERVER_TIME / (24 * 60 * 60 * 1000));
        return `You must be in the server for at least ${days} day(s) to enter giveaways.`;
    }

    // Check cooldown
    const giveaway = interaction.client.giveaways.get(interaction.message.id);
    const lastEntry = giveaway.entryCooldowns.get(member.id);
    if (lastEntry && now - lastEntry < ENTRY_COOLDOWN) {
        const remaining = Math.ceil((ENTRY_COOLDOWN - (now - lastEntry)) / 1000);
        return `Please wait ${remaining} seconds before trying to enter again.`;
    }

    return null; // No eligibility issues
}

async function handleReroll(interaction) {
    const messageId = interaction.options?.getString('message_id') || interaction.messageId;
    const giveaway = interaction.client.giveaways.get(messageId);

    if (!giveaway || !giveaway.ended) {
        return interaction.reply?.({
            content: 'Could not find an ended giveaway with that message ID!',
            ephemeral: true
        });
    }

    const channel = await interaction.client.channels.fetch(giveaway.channelId);
    if (!channel) return;

    const participants = Array.from(giveaway.participants);
    if (participants.length === 0) {
        return interaction.reply?.({
            content: 'There were no participants in this giveaway!',
            ephemeral: true
        });
    }

    const winner = participants[Math.floor(Math.random() * participants.length)];
    await channel.send({
        content: `🎉 New winner for **${giveaway.prize}**: <@${winner}>!`,
        allowedMentions: { users: [winner] }
    });

    if (interaction.reply) {
        await interaction.reply({
            content: 'Successfully rerolled the giveaway!',
            ephemeral: true
        });
    }

    return winner;
}

module.exports = {
    checkEligibility,
    handleReroll,
    ENTRY_COOLDOWN,
    MIN_ACCOUNT_AGE,
    MIN_SERVER_TIME
}; 