// Add this to your existing interactionCreate event
if (interaction.isButton()) {
    if (interaction.customId === 'giveaway-enter') {
        const giveaway = interaction.client.giveaways.get(interaction.message.id);
        
        if (!giveaway || giveaway.ended) {
            return interaction.reply({
                content: 'This giveaway has ended!',
                ephemeral: true
            });
        }

        const userId = interaction.user.id;
        
        if (giveaway.participants.has(userId)) {
            giveaway.participants.delete(userId);
            await interaction.reply({
                content: 'You have left the giveaway!',
                ephemeral: true
            });
        } else {
            giveaway.participants.add(userId);
            await interaction.reply({
                content: 'You have entered the giveaway! Good luck! 🍀',
                ephemeral: true
            });
        }

        interaction.client.giveaways.set(interaction.message.id, giveaway);
    }
} 