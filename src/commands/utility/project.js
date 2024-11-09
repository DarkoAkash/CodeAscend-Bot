const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const fetch = require('node-fetch');

// Add these constants at the top
const REVIEW_CHANNEL_ID = '1274914843270316103'; // Channel for staff to review submissions
const PUBLIC_CHANNEL_ID = '1274728147061051412'; // Public showcase channel
const COOLDOWN_HOURS = 1; // Cooldown period in hours
const cooldowns = new Map(); // Store user cooldowns
const ADMIN_ALERTS_CHANNEL_ID = '1274914843270316103'; // You can use the same review channel for admin alerts
const REPORT_THRESHOLD = 3; // Number of reports before auto-hiding
const reportedProjects = new Map(); // Store reports in memory (consider using database for persistence)

// Helper function to extract owner and repo from GitHub URL
function extractGitHubInfo(url) {
    try {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/').filter(part => part);
        if (parts.length >= 2) {
            return { owner: parts[0], repo: parts[1] };
        }
    } catch (e) {
        return null;
    }
    return null;
}

// Helper function to format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Helper function to determine project status color
function getStatusColor(lastUpdated) {
    const monthsAgo = (Date.now() - new Date(lastUpdated)) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo <= 1) return 0x2ECC71; // Active (Green)
    if (monthsAgo <= 3) return 0xF1C40F; // Semi-active (Yellow)
    return 0xE74C3C; // Inactive (Red)
}

// Helper function to format numbers
function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

// Predefined categories for projects
const PROJECT_CATEGORIES = {
    WEB: 'Web Development',
    MOBILE: 'Mobile Development',
    ML: 'Machine Learning/AI',
    GAME: 'Game Development',
    BOT: 'Bot/Automation',
    BACKEND: 'Backend Development',
    FRONTEND: 'Frontend Development',
    FULLSTACK: 'Full Stack',
    DEVOPS: 'DevOps/Cloud',
    OTHER: 'Other'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('project')
        .setDescription('Manage project submissions')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new project')
                .addStringOption(option =>
                    option
                        .setName('github')
                        .setDescription('GitHub repository URL')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('demo')
                        .setDescription('Demo URL or description')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Project category')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌐 Web Development', value: 'WEB' },
                            { name: '📱 Mobile Development', value: 'MOBILE' },
                            { name: '🤖 Machine Learning/AI', value: 'ML' },
                            { name: '🎮 Game Development', value: 'GAME' },
                            { name: '🤖 Bot/Automation', value: 'BOT' },
                            { name: '⚙️ Backend Development', value: 'BACKEND' },
                            { name: '🎨 Frontend Development', value: 'FRONTEND' },
                            { name: '⚡ Full Stack', value: 'FULLSTACK' },
                            { name: '☁️ DevOps/Cloud', value: 'DEVOPS' },
                            { name: '🔧 Other', value: 'OTHER' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Additional description (optional)')
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('tags')
                        .setDescription('Custom tags (comma-separated, max 5 tags)')
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('thumbnail')
                        .setDescription('Thumbnail URL for your project (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('report')
                .setDescription('Report a project for review')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('ID of the project message to report')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for reporting')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Spam', value: 'spam' },
                            { name: 'Inappropriate Content', value: 'inappropriate' },
                            { name: 'Misleading Information', value: 'misleading' },
                            { name: 'Copied Project', value: 'copied' },
                            { name: 'Other', value: 'other' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('details')
                        .setDescription('Additional details about the report')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('approve')
                .setDescription('Approve a project submission')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('ID of the project message to approve')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reject')
                .setDescription('Reject a project submission')
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('ID of the project message to reject')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for rejection')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'approve') {
            return await handleApprove(interaction);
        }

        if (subcommand === 'reject') {
            return await handleReject(interaction);
        }

        if (subcommand === 'report') {
            return await handleReport(interaction);
        }

        // Handle project submission
        await handleSubmission(interaction);
    },

    // Add this function to handle button interactions
    async handleButtons(interaction) {
        if (!interaction.isButton()) return;

        if (interaction.customId.startsWith('hide_project_')) {
            const messageId = interaction.customId.split('_')[2];
            try {
                const publicChannel = await interaction.client.channels.fetch(PUBLIC_CHANNEL_ID);
                const message = await publicChannel.messages.fetch(messageId);
                
                // Create a thread before deleting the message
                const thread = await message.startThread({
                    name: `Feedback for ${message.embeds[0]?.title || 'Project'}`,
                    autoArchiveDuration: 1440, // Archive after 24 hours of inactivity
                    reason: 'Project feedback thread'
                });

                // Send initial message in thread
                await thread.send({
                    content: 'This thread is for providing feedback about this project. Please keep discussions constructive and respectful.'
                });

                // Try to notify the user
                try {
                    const userId = message.embeds[0]?.footer?.text.match(/Submitted by (.+?) \((\d+)\)/)?.[2];
                    if (userId) {
                        const user = await interaction.client.users.fetch(userId);
                        await user.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(0xFF0000)
                                    .setTitle('❌ Project Deleted')
                                    .setDescription('Your project has been deleted by moderators due to community reports.')
                                    .addFields(
                                        { name: 'Project Name', value: message.embeds[0]?.title || 'Unknown Project' },
                                        { name: 'Feedback Thread', value: `You can view feedback here: ${thread.url}` }
                                    )
                                    .setTimestamp()
                            ]
                        });
                    }
                } catch (error) {
                    console.error('Could not DM user:', error);
                }

                // Delete the original message
                await message.delete();

                // Send a replacement message
                const deletedMessage = await publicChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle('🚫 Project Deleted')
                            .setDescription('This project has been deleted by moderators due to community reports.')
                            .addFields(
                                { name: 'Feedback Thread', value: `You can provide feedback here: ${thread.url}` }
                            )
                            .setTimestamp()
                    ]
                });

                await interaction.reply({
                    content: `Project has been deleted and feedback thread created: ${thread.url}`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error handling project deletion:', error);
                await interaction.reply({
                    content: 'Error processing the project deletion. Please try again.',
                    ephemeral: true
                });
            }
        }

        if (interaction.customId.startsWith('dismiss_report_')) {
            const messageId = interaction.customId.split('_')[2];
            try {
                // Clear reports for this project
                reportedProjects.delete(messageId);

                await interaction.reply({
                    content: 'Reports have been dismissed.',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error dismissing report:', error);
                await interaction.reply({
                    content: 'Error dismissing report. Please try again.',
                    ephemeral: true
                });
            }
        }
    }
};

async function handleSubmission(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // Check cooldown
        const userId = interaction.user.id;
        const cooldownExpiration = cooldowns.get(userId);
        
        if (cooldownExpiration && Date.now() < cooldownExpiration) {
            const timeLeft = Math.ceil((cooldownExpiration - Date.now()) / (1000 * 60));
            return await interaction.editReply({
                content: `Please wait ${timeLeft} minutes before submitting another project.`,
                ephemeral: true
            });
        }

        const github = interaction.options.getString('github');
        const thumbnail = interaction.options.getString('thumbnail');
        const demo = interaction.options.getString('demo');
        const category = interaction.options.getString('category');
        const rawTags = interaction.options.getString('tags');
        const userDescription = interaction.options.getString('description');

        // Process tags
        let tags = [];
        if (rawTags) {
            tags = rawTags
                .split(',')
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length > 0)
                .slice(0, 5); // Limit to 5 tags
        }

        // Validate GitHub URL
        if (!github.toLowerCase().includes('github.com')) {
            return await interaction.editReply({
                content: 'Please provide a valid GitHub repository URL.',
                ephemeral: true
            });
        }

        // Extract GitHub repo information
        const repoInfo = extractGitHubInfo(github);
        if (!repoInfo) {
            return await interaction.editReply({
                content: 'Unable to parse GitHub URL. Please make sure it\'s in the format: https://github.com/owner/repo',
                ephemeral: true
            });
        }

        // Fetch repository data from GitHub API
        const repoResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Discord-Bot'
            }
        });
        
        if (!repoResponse.ok) {
            throw new Error(`GitHub API responded with status ${repoResponse.status}`);
        }

        const repoData = await repoResponse.json();

        // Get repository languages
        const languagesResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/languages`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Discord-Bot'
            }
        });
        
        const languages = await languagesResponse.json();
        const languagesList = Object.keys(languages).join(', ');

        // Determine thumbnail URL
        let finalThumbnail = thumbnail;
        if (!finalThumbnail) {
            finalThumbnail = repoData.owner.avatar_url;
        }

        // Create status indicator
        const statusColor = getStatusColor(repoData.updated_at);
        const lastUpdateDate = new Date(repoData.updated_at);
        const daysSinceUpdate = Math.floor((Date.now() - lastUpdateDate) / (1000 * 60 * 60 * 24));
        const statusEmoji = daysSinceUpdate <= 30 ? '🟢' : daysSinceUpdate <= 90 ? '🟡' : '🔴';

        // Get category emoji
        const categoryEmojis = {
            WEB: '🌐',
            MOBILE: '📱',
            ML: '🤖',
            GAME: '🎮',
            BOT: '🤖',
            BACKEND: '⚙️',
            FRONTEND: '🎨',
            FULLSTACK: '⚡',
            DEVOPS: '☁️',
            OTHER: '🔧'
        };

        // Create an enhanced embed for the project
        const projectEmbed = new EmbedBuilder()
            .setColor(statusColor)
            .setTitle(`${statusEmoji} ${repoData.name}`)
            .setURL(repoData.html_url)
            .setThumbnail(finalThumbnail)
            .setDescription(userDescription || repoData.description || 'No description provided.')
            .addFields(
                {
                    name: '🏷️ Category',
                    value: `${categoryEmojis[category]} ${PROJECT_CATEGORIES[category]}`,
                    inline: true
                },
                {
                    name: '🔖 Tags',
                    value: tags.length > 0 ? tags.map(tag => `\`${tag}\``).join(', ') : 'No tags',
                    inline: true
                },
                {
                    name: '📊 Repository Stats',
                    value: [
                        `⭐ **${formatNumber(repoData.stargazers_count)}** stars`,
                        `🔄 **${formatNumber(repoData.forks_count)}** forks`,
                        `👁️ **${formatNumber(repoData.watchers_count)}** watchers`
                    ].join(' • '),
                    inline: false
                },
                {
                    name: '💻 Tech Stack',
                    value: `\`\`\`${languagesList || 'Not specified'}\`\`\``,
                    inline: false
                },
                {
                    name: '🔗 Quick Links',
                    value: [
                        `[View Code](${repoData.html_url})`,
                        `[Demo](${demo})`,
                        repoData.homepage ? `[Homepage](${repoData.homepage})` : null
                    ].filter(Boolean).join(' • '),
                    inline: false
                },
                {
                    name: '📅 Project Info',
                    value: [
                        `Created: ${formatDate(repoData.created_at)}`,
                        `Last Updated: ${formatDate(repoData.updated_at)}`,
                        `Size: ${(repoData.size / 1024).toFixed(2)} MB`
                    ].join('\n'),
                    inline: false
                }
            )
            .setAuthor({
                name: repoInfo.owner,
                iconURL: repoData.owner.avatar_url,
                url: `https://github.com/${repoInfo.owner}`
            })
            .setTimestamp()
            .setFooter({
                text: `Submitted by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        // Create buttons for interaction
        const githubButton = new ButtonBuilder()
            .setLabel('View on GitHub')
            .setURL(repoData.html_url)
            .setStyle(ButtonStyle.Link)
            .setEmoji('📂');

        const demoButton = new ButtonBuilder()
            .setLabel('View Demo')
            .setURL(demo)
            .setStyle(ButtonStyle.Link)
            .setEmoji('🔗');

        const shareButton = new ButtonBuilder()
            .setCustomId('share_project')
            .setLabel('Share Project')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📤');

        const feedbackButton = new ButtonBuilder()
            .setCustomId('give_feedback')
            .setLabel('Give Feedback')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💭');

        // Create action rows for buttons
        const linkButtons = new ActionRowBuilder().addComponents(githubButton, demoButton);
        const actionButtons = new ActionRowBuilder().addComponents(shareButton, feedbackButton);

        // Create approve/reject buttons for moderators
        const moderationButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('approve_project')
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('reject_project')
                    .setLabel('Reject')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        // First, send to review channel
        const reviewChannel = await interaction.client.channels.fetch(REVIEW_CHANNEL_ID);
        if (!reviewChannel) {
            return await interaction.editReply({
                content: 'Review channel not found! Please contact an administrator.',
                ephemeral: true
            });
        }

        // Send to review channel with moderation buttons
        const message = await reviewChannel.send({
            content: `New project submission from ${interaction.user.tag} (${interaction.user.id})`,
            embeds: [projectEmbed],
            components: [linkButtons, actionButtons, moderationButtons]
        });

        // Set cooldown
        cooldowns.set(userId, Date.now() + (COOLDOWN_HOURS * 60 * 60 * 1000));

        await interaction.editReply({
            content: 'Your project has been submitted for review. You will be notified once it\'s approved.',
            ephemeral: true
        });

        // Create collector with a more reasonable timeout (24 hours)
        const collector = message.createMessageComponentCollector({
            time: 24 * 60 * 60 * 1000 // 24 hours
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'share_project') {
                const shareEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('Share This Project')
                    .setDescription(`Share this project by sending this link:\n${message.url}`)
                    .addFields(
                        { name: 'Project Name', value: repoData.name },
                        { name: 'Quick Share', value: `Copy this: <${message.url}>` }
                    );

                await i.reply({
                    embeds: [shareEmbed],
                    ephemeral: true
                });
            }

            if (i.customId === 'give_feedback') {
                // Create the modal using proper Discord.js builders
                const modal = new ModalBuilder()
                    .setCustomId(`feedback_${message.id}`)
                    .setTitle(`Feedback for ${repoData.name}`);

                // Create the text input component
                const feedbackInput = new TextInputBuilder()
                    .setCustomId('feedback_text')
                    .setLabel('Your Feedback')
                    .setStyle(TextInputStyle.Paragraph)
                    .setMinLength(10)
                    .setMaxLength(1000)
                    .setPlaceholder('Share your thoughts about this project...')
                    .setRequired(true);

                // Add the text input to an action row
                const firstActionRow = new ActionRowBuilder().addComponents(feedbackInput);

                // Add the action row to the modal
                modal.addComponents(firstActionRow);

                // Show the modal
                await i.showModal(modal);
            }
        });

        // Update the modal submission handler
        interaction.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isModalSubmit()) return;
            if (!interaction.customId.startsWith('feedback_')) return;

            try {
                const feedback = interaction.fields.getTextInputValue('feedback_text');
                const feedbackEmbed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setTitle('New Feedback Received')
                    .setAuthor({
                        name: interaction.user.tag,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setDescription(feedback)
                    .setTimestamp();

                // Get the original message ID from the modal custom ID
                const messageId = interaction.customId.split('_')[1];
                const channel = await interaction.client.channels.fetch(REVIEW_CHANNEL_ID);
                const originalMessage = await channel.messages.fetch(messageId);

                // Send feedback as a reply to the original message
                await originalMessage.reply({
                    embeds: [feedbackEmbed],
                    allowedMentions: { repliedUser: false }
                });

                await interaction.reply({
                    content: 'Your feedback has been submitted!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error handling feedback submission:', error);
                await interaction.reply({
                    content: 'There was an error submitting your feedback. Please try again.',
                    ephemeral: true
                });
            }
        });

    } catch (error) {
        console.error('Error in project command:', error);
        await interaction.editReply({
            content: error.message.includes('404') 
                ? 'GitHub repository not found. Please check the URL and make sure the repository is public.'
                : 'There was an error while submitting your project. Please try again later or contact an administrator.',
            ephemeral: true
        });
    }
}

async function handleApprove(interaction) {
    // Defer the reply immediately
    await interaction.deferReply({ ephemeral: true });

    try {
        const messageId = interaction.options.getString('message_id');
        const reviewChannel = await interaction.client.channels.fetch(REVIEW_CHANNEL_ID);
        const publicChannel = await interaction.client.channels.fetch(PUBLIC_CHANNEL_ID);

        // Fetch the message from review channel
        const reviewMessage = await reviewChannel.messages.fetch(messageId);
        if (!reviewMessage) {
            return await interaction.editReply({
                content: 'Could not find the specified message.',
                ephemeral: true
            });
        }

        // Get the original embed and components
        const originalEmbed = reviewMessage.embeds[0];
        const originalComponents = reviewMessage.components.slice(0, -1); // Remove moderation buttons

        // Send to public channel
        const publicMessage = await publicChannel.send({
            embeds: [originalEmbed],
            components: originalComponents
        });

        // Add reactions
        const reactions = ['⭐', '👍', '🚀', '💡', '❤️'];
        for (const reaction of reactions) {
            await publicMessage.react(reaction);
        }

        // Delete from review channel
        await reviewMessage.delete();

        // Notify the original submitter
        const userId = reviewMessage.content.match(/\((\d+)\)/)[1];
        try {
            const user = await interaction.client.users.fetch(userId);
            await user.send({
                content: `Your project has been approved and is now visible in <#${PUBLIC_CHANNEL_ID}>!`,
                embeds: [originalEmbed]
            });
        } catch (error) {
            console.error('Could not DM user:', error);
        }

        await interaction.editReply({
            content: `Project approved and moved to <#${PUBLIC_CHANNEL_ID}>`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error in approve command:', error);
        await interaction.editReply({
            content: 'There was an error processing the approval.',
            ephemeral: true
        });
    }
}

async function handleReject(interaction) {
    // Defer the reply immediately
    await interaction.deferReply({ ephemeral: true });

    try {
        const messageId = interaction.options.getString('message_id');
        const reason = interaction.options.getString('reason');
        const reviewChannel = await interaction.client.channels.fetch(REVIEW_CHANNEL_ID);

        // Fetch the message from review channel
        const reviewMessage = await reviewChannel.messages.fetch(messageId);
        if (!reviewMessage) {
            return await interaction.editReply({
                content: 'Could not find the specified message.',
                ephemeral: true
            });
        }

        // Notify the original submitter
        const userId = reviewMessage.content.match(/\((\d+)\)/)[1];
        try {
            const user = await interaction.client.users.fetch(userId);
            await user.send({
                content: `Your project submission has been rejected.\nReason: ${reason}\n\nYou can submit again after the cooldown period.`,
                embeds: reviewMessage.embeds
            });
        } catch (error) {
            console.error('Could not DM user:', error);
        }

        // Delete from review channel
        await reviewMessage.delete();

        await interaction.editReply({
            content: `Project rejected. User has been notified.`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error in reject command:', error);
        await interaction.editReply({
            content: 'There was an error processing the rejection.',
            ephemeral: true
        });
    }
}

async function handleReport(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const messageId = interaction.options.getString('message_id');
        const reason = interaction.options.getString('reason');
        const details = interaction.options.getString('details') || 'No additional details provided';
        const publicChannel = await interaction.client.channels.fetch(PUBLIC_CHANNEL_ID);
        const adminChannel = await interaction.client.channels.fetch(ADMIN_ALERTS_CHANNEL_ID);

        // Fetch the reported message
        const reportedMessage = await publicChannel.messages.fetch(messageId);
        if (!reportedMessage) {
            return await interaction.editReply({
                content: 'Could not find the specified project.',
                ephemeral: true
            });
        }

        // Check if user has already reported this project
        const reportKey = `${messageId}`;
        let projectReports = reportedProjects.get(reportKey) || { count: 0, reporters: new Set() };

        if (projectReports.reporters.has(interaction.user.id)) {
            return await interaction.editReply({
                content: 'You have already reported this project.',
                ephemeral: true
            });
        }

        // Update report count and add reporter
        projectReports.count++;
        projectReports.reporters.add(interaction.user.id);
        reportedProjects.set(reportKey, projectReports);

        // Create report embed
        const reportEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Project Reported')
            .addFields(
                { name: 'Project', value: `[Jump to Project](${reportedMessage.url})`, inline: true },
                { name: 'Reporter', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Report Count', value: `${projectReports.count}/${REPORT_THRESHOLD}`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Details', value: details, inline: false }
            )
            .setTimestamp();

        // Send report to admin channel
        await adminChannel.send({
            embeds: [reportEmbed],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`hide_project_${messageId}`)
                            .setLabel('Hide Project')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId(`dismiss_report_${messageId}`)
                            .setLabel('Dismiss Report')
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        });

        // If report threshold reached, hide the project
        if (projectReports.count >= REPORT_THRESHOLD) {
            // Add a warning to the original message
            const warningEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ This project is under review')
                .setDescription('This project has been temporarily hidden due to multiple reports.');

            await reportedMessage.edit({
                embeds: [...reportedMessage.embeds, warningEmbed],
                components: [] // Remove all buttons
            });

            // Send alert to admin channel
            await adminChannel.send({
                content: '@here A project has reached the report threshold and has been automatically hidden.',
                embeds: [reportEmbed]
            });
        }

        await interaction.editReply({
            content: 'Thank you for your report. Our moderators will review it.',
            ephemeral: true
        });

    } catch (error) {
        console.error('Error in report command:', error);
        await interaction.editReply({
            content: 'There was an error processing your report. Please try again later.',
            ephemeral: true
        });
    }
}