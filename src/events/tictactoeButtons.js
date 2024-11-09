const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

let gamesMap;
try {
    gamesMap = require('../commands/fun/tictactoe').games;
} catch (error) {
    gamesMap = new Map();
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton() || !interaction.customId.startsWith('ttt_')) return;

        try {
            // Defer the update immediately to prevent interaction timeout
            await interaction.deferUpdate();

            const gameData = gamesMap.get(interaction.channelId);

            if (!gameData) {
                return await interaction.followUp({
                    content: '❌ This game has expired.',
                    ephemeral: true
                });
            }

            const { game, players, startTime } = gameData;
            const position = parseInt(interaction.customId.split('_')[1]);

            if (players[game.currentPlayer] !== interaction.user.id) {
                return await interaction.followUp({
                    content: "❌ It's not your turn!",
                    ephemeral: true
                });
            }

            if (!game.makeMove(position)) {
                return await interaction.followUp({
                    content: '❌ Invalid move!',
                    ephemeral: true
                });
            }

            const result = game.checkWinner();
            const buttons = createGameButtons(game, result?.winningLine || []);
            const rows = [];
            for (let i = 0; i < 9; i += 3) {
                rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 3)));
            }

            const gameEmbed = new EmbedBuilder()
                .setTitle('🎮 Tic Tac Toe')
                .setDescription(`${interaction.client.users.cache.get(players['❌'])} (❌) VS ${interaction.client.users.cache.get(players['⭕'])} (⭕)`)
                .setColor(game.currentPlayer === '❌' ? '#FF0000' : '#0000FF')
                .setTimestamp();

            if (result) {
                const gameDuration = Math.floor((Date.now() - startTime) / 1000);
                if (result.winner === 'tie') {
                    gameEmbed
                        .addFields(
                            { name: 'Game Over!', value: "🤝 It's a tie!", inline: false },
                            { name: 'Duration', value: `⏱️ ${gameDuration} seconds`, inline: true },
                            { name: 'Moves Made', value: `🎯 ${game.moves}`, inline: true }
                        )
                        .setColor('#808080');
                } else {
                    const winner = interaction.client.users.cache.get(players[result.winner]);
                    gameEmbed
                        .addFields(
                            { name: 'Game Over!', value: `🏆 Winner: ${winner}`, inline: false },
                            { name: 'Duration', value: `⏱️ ${gameDuration} seconds`, inline: true },
                            { name: 'Moves Made', value: `🎯 ${game.moves}`, inline: true }
                        )
                        .setColor('#00FF00');
                }
                gamesMap.delete(interaction.channelId);
            } else {
                const currentPlayerUser = interaction.client.users.cache.get(players[game.currentPlayer]);
                gameEmbed.addFields(
                    { name: 'Current Turn', value: `${game.currentPlayer} ${currentPlayerUser}`, inline: true },
                    { name: 'Moves Made', value: `🎯 ${game.moves}`, inline: true }
                );
            }

            await interaction.editReply({
                embeds: [gameEmbed],
                components: rows
            });

        } catch (error) {
            console.error('Error in TicTacToe button handler:', error);
            try {
                await interaction.followUp({
                    content: '❌ An error occurred while processing your move.',
                    ephemeral: true
                });
            } catch (e) {
                console.error('Error sending error message:', e);
            }
        }
    }
};

// Helper function to create game buttons
function createGameButtons(game, winningLine = []) {
    const buttons = [];
    for (let i = 0; i < 9; i++) {
        const button = new ButtonBuilder()
            .setCustomId(`ttt_${i}`)
            .setStyle(game.board[i] ? 
                (game.board[i] === '❌' ? ButtonStyle.Danger : ButtonStyle.Primary) : 
                ButtonStyle.Secondary)
            .setLabel(game.board[i] || '\u200b')
            .setDisabled(game.board[i] !== null || game.gameOver);

        // Highlight winning line
        if (winningLine.includes(i)) {
            button.setStyle(ButtonStyle.Success);
        }

        buttons.push(button);
    }
    return buttons;
} 