const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

class TicTacToe {
    constructor() {
        this.board = Array(9).fill(null);
        this.currentPlayer = '❌';
        this.gameOver = false;
        this.moves = 0;
    }

    makeMove(position) {
        if (this.board[position] || this.gameOver) return false;
        this.board[position] = this.currentPlayer;
        this.moves++;
        this.currentPlayer = this.currentPlayer === '❌' ? '⭕' : '❌';
        return true;
    }

    checkWinner() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                this.gameOver = true;
                return {
                    winner: this.board[a],
                    winningLine: pattern
                };
            }
        }

        if (this.moves === 9) {
            this.gameOver = true;
            return { winner: 'tie', winningLine: [] };
        }

        return null;
    }
}

const games = new Map();

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Play TicTacToe with another user')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Select your opponent')
                .setRequired(true)),

    games,

    async execute(interaction) {
        const opponent = interaction.options.getUser('opponent');
        
        if (opponent.bot) {
            return interaction.reply({
                content: '❌ You cannot play against a bot!',
                ephemeral: true
            });
        }
        
        if (opponent.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ You cannot play against yourself!',
                ephemeral: true
            });
        }

        // Check if there's already a game in this channel
        if (games.has(interaction.channelId)) {
            return interaction.reply({
                content: '❌ There is already a game in progress in this channel!',
                ephemeral: true
            });
        }

        const game = new TicTacToe();
        games.set(interaction.channelId, {
            game,
            players: {
                '❌': interaction.user.id,
                '⭕': opponent.id
            },
            startTime: Date.now()
        });

        const buttons = createGameButtons(game);
        const rows = [];
        for (let i = 0; i < 9; i += 3) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 3)));
        }

        const gameEmbed = new EmbedBuilder()
            .setTitle('🎮 Tic Tac Toe')
            .setDescription(`${interaction.user} (❌) VS ${opponent} (⭕)`)
            .addFields(
                { name: 'Current Turn', value: `❌ ${interaction.user}`, inline: true },
                { name: 'Moves Made', value: '0', inline: true }
            )
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.reply({
            embeds: [gameEmbed],
            components: rows
        });
    }
}; 