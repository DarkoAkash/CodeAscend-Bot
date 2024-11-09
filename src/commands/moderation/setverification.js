const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createCanvas, registerFont } = require('canvas');
const path = require('path');

// Store verification data in memory (consider using a database for persistence)
const verificationData = new Map();
const pendingVerifications = new Map();

// CAPTCHA generation settings
const CAPTCHA_LENGTH = 6;
const CAPTCHA_EXPIRY = 5 * 60 * 1000; // 5 minutes

function generateCaptchaText() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters
    let captcha = '';
    for (let i = 0; i < CAPTCHA_LENGTH; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return captcha;
}

function generateCaptchaImage(text) {
    const canvas = createCanvas(300, 100);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise
    for (let i = 0; i < 50; i++) {
        ctx.strokeStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.2)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }

    // Text
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add distortion to each character
    let x = 50;
    for (let char of text) {
        ctx.save();
        ctx.translate(x, 50);
        ctx.rotate((Math.random() - 0.5) * 0.3);
        ctx.fillText(char, 0, 0);
        ctx.restore();
        x += 40;
    }

    return canvas.toBuffer();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setverification')
        .setDescription('Configure verification settings for the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable verification system')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel where users will verify')
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role to give after verification')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable verification system')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'enable') {
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');

            // Save verification settings
            verificationData.set(interaction.guildId, {
                enabled: true,
                channelId: channel.id,
                roleId: role.id
            });

            // Create verification message
            const verifyEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Server Verification')
                .setDescription('Click the button below to start the verification process.')
                .addFields(
                    { name: 'Why verify?', value: 'Verification helps us maintain a safe and spam-free environment.' },
                    { name: 'Instructions', value: '1. Click the verify button\n2. Solve the CAPTCHA\n3. Get access to the server' }
                );

            const verifyButton = new ButtonBuilder()
                .setCustomId('start_verify')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✅');

            const row = new ActionRowBuilder().addComponents(verifyButton);

            await channel.send({
                embeds: [verifyEmbed],
                components: [row]
            });

            await interaction.reply({
                content: `Verification system enabled in ${channel}. Users will receive the ${role} role upon verification.`,
                ephemeral: true
            });
        } else if (subcommand === 'disable') {
            verificationData.delete(interaction.guildId);
            await interaction.reply({
                content: 'Verification system has been disabled.',
                ephemeral: true
            });
        }
    },

    async handleVerification(interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        const settings = verificationData.get(interaction.guildId);
        if (!settings || !settings.enabled) return;

        if (interaction.customId === 'start_verify') {
            // Generate CAPTCHA
            const captchaText = generateCaptchaText();
            const captchaImage = generateCaptchaImage(captchaText);

            // Store CAPTCHA data
            pendingVerifications.set(interaction.user.id, {
                code: captchaText,
                expires: Date.now() + CAPTCHA_EXPIRY
            });

            // Create verification embed
            const captchaEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('CAPTCHA Verification')
                .setDescription('Please enter the code shown in the image below.')
                .setImage('attachment://captcha.png')
                .setFooter({ text: 'You have 5 minutes to complete this verification.' });

            const verifyInput = new ButtonBuilder()
                .setCustomId('submit_captcha')
                .setLabel('Enter Code')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(verifyInput);

            await interaction.reply({
                embeds: [captchaEmbed],
                components: [row],
                files: [{ attachment: captchaImage, name: 'captcha.png' }],
                ephemeral: true
            });
        }

        if (interaction.customId === 'submit_captcha') {
            const modal = {
                title: 'CAPTCHA Verification',
                custom_id: 'captcha_modal',
                components: [{
                    type: 1,
                    components: [{
                        type: 4,
                        custom_id: 'captcha_input',
                        label: 'Enter the CAPTCHA code',
                        style: 1,
                        min_length: CAPTCHA_LENGTH,
                        max_length: CAPTCHA_LENGTH,
                        placeholder: 'Enter the code shown in the image',
                        required: true
                    }]
                }]
            };

            await interaction.showModal(modal);
        }

        if (interaction.customId === 'captcha_modal') {
            const verification = pendingVerifications.get(interaction.user.id);
            if (!verification) {
                return await interaction.reply({
                    content: 'Verification session expired. Please start over.',
                    ephemeral: true
                });
            }

            const submittedCode = interaction.fields.getTextInputValue('captcha_input');
            if (submittedCode.toUpperCase() === verification.code) {
                // Verification successful
                try {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    await member.roles.add(settings.roleId);
                    pendingVerifications.delete(interaction.user.id);

                    await interaction.reply({
                        content: '✅ Verification successful! You now have access to the server.',
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error adding verified role:', error);
                    await interaction.reply({
                        content: 'An error occurred while verifying. Please contact a moderator.',
                        ephemeral: true
                    });
                }
            } else {
                await interaction.reply({
                    content: '❌ Incorrect code. Please try again.',
                    ephemeral: true
                });
            }
        }
    }
}; 