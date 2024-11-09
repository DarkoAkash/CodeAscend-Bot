const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const path = require('path');
const fs = require('fs');

// Register custom font - using a more reliable font path
const fontPath = path.join(__dirname, '../assets/fonts/Rubik-Bold.ttf');
Canvas.registerFont(fontPath, { family: 'Rubik Bold' });

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            console.log('Starting welcome message generation...');

            // Create welcome canvas
            const canvas = Canvas.createCanvas(1024, 500);
            const ctx = canvas.getContext('2d');

            // Load background
            const background = await Canvas.loadImage(
                path.join(__dirname, '../assets/standard.gif')
            );

            // Draw background
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // Add gradient overlay
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
            gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add decorative elements
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(50, 50);
            ctx.lineTo(canvas.width - 50, 50);
            ctx.lineTo(canvas.width - 50, canvas.height - 50);
            ctx.lineTo(50, canvas.height - 50);
            ctx.lineTo(50, 50);
            ctx.stroke();

            // Configure text
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFFF';

            // Add welcome text with shadow
            ctx.font = '80px "Rubik Bold"';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            ctx.fillText('WELCOME', canvas.width / 2, 120); // Moved up slightly

            // Reset shadow
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Add avatar with circular frame
            ctx.save();
            ctx.beginPath();
            const centerX = canvas.width / 2;
            const centerY = 220; // Moved up slightly
            const radius = 80;

            // Create circular clip
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // Add avatar glow
            ctx.shadowColor = '#ff7b00';
            ctx.shadowBlur = 15;
            
            const avatar = await Canvas.loadImage(
                member.user.displayAvatarURL({ extension: 'png', size: 256 })
            );
            ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
            
            // Restore context
            ctx.restore();

            // Add avatar border
            ctx.strokeStyle = '#ff7b00';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
            ctx.stroke();

            // Add member name with gradient (moved down)
            const username = member.user.username;
            ctx.font = '48px "Rubik Bold"';
            const gradient2 = ctx.createLinearGradient(0, 350, canvas.width, 350);
            gradient2.addColorStop(0, '#ff7b00');
            gradient2.addColorStop(0.5, '#ff9500');
            gradient2.addColorStop(1, '#ff7b00');
            ctx.fillStyle = gradient2;
            ctx.fillText(username, canvas.width / 2, 350); // Moved down

            // Add member count with style (moved down)
            ctx.font = '36px "Rubik Bold"';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(
                `Member #${member.guild.memberCount}`,
                canvas.width / 2,
                420 // Moved down
            );

            // Create attachment
            const attachment = new AttachmentBuilder(canvas.toBuffer(), {
                name: 'welcome.png'
            });

            // Create welcome embed with advanced styling
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#ff7b00')
                .setTitle('🌟 New Member Has Arrived! 🌟')
                .setDescription(`
                    Welcome to **${member.guild.name}**, ${member.user}! 
                    
                    We're thrilled to have you join our community! 🎉
                `)
                .addFields(
                    {
                        name: '📊 Server Stats',
                        value: `\`\`\`\n• Total Members: ${member.guild.memberCount}\n• Your Member ID: #${member.guild.memberCount}\n\`\`\``,
                        inline: false
                    },
                    {
                        name: '🕒 Account Age',
                        value: `Account created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                        inline: true
                    },
                    {
                        name: '🎯 Join Position',
                        value: `You're our ${member.guild.memberCount}${getNumberSuffix(member.guild.memberCount)} member!`,
                        inline: true
                    },
                    {
                        name: '🔍 Getting Started',
                        value: `
                            > 📜 Read the rules in <#1274730764835229726>
                            > 👋 Introduce yourself in <Under Development>
                            > 🎭 Get your roles in <Under Development>
                            > 💬 Start chatting in <Under Development>
                        `,
                        inline: false
                    }
                )
                .setImage('attachment://welcome.png')
                .setTimestamp()
                .setFooter({
                    text: `Welcome to ${member.guild.name} • Enjoy your stay!`,
                    iconURL: member.guild.iconURL()
                });

            // Find welcome channel
            const welcomeChannel = member.guild.channels.cache.find(
                channel => channel.name.toLowerCase() === 'joins' || 
                          channel.name.toLowerCase() === 'welcome' ||
                          channel.name.toLowerCase() === 'welcomes'
            );

            if (welcomeChannel) {
                console.log(`Found welcome channel: ${welcomeChannel.name}`);
                await welcomeChannel.send({
                    content: `🎊 Welcome ${member.user}! We hope you'll enjoy your stay! 🎊`,
                    embeds: [welcomeEmbed],
                    files: [attachment]
                });
                console.log('Welcome message sent successfully');
            } else {
                console.log('No welcome channel found');
            }

        } catch (error) {
            console.error('Error in welcome message:', error);
        }
    }
};

// Helper function for number suffixes
function getNumberSuffix(number) {
    const j = number % 10;
    const k = number % 100;
    if (j == 1 && k != 11) return 'st';
    if (j == 2 && k != 12) return 'nd';
    if (j == 3 && k != 13) return 'rd';
    return 'th';
} 