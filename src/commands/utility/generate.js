const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { HfInference } = require('@huggingface/inference');

// Initialize HuggingFace
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generate various content using AI')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ideas')
                .setDescription('Generate project ideas')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('What kind of project are you looking for?')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('difficulty')
                        .setDescription('Project difficulty level')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Beginner', value: 'beginner' },
                            { name: 'Intermediate', value: 'intermediate' },
                            { name: 'Advanced', value: 'advanced' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('tech')
                        .setDescription('Specific technologies (e.g., React, Python)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('code')
                .setDescription('Generate code snippets or solutions')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('Describe what code you want to generate')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('language')
                        .setDescription('Programming language')
                        .setRequired(true)
                        .addChoices(
                            { name: 'JavaScript', value: 'javascript' },
                            { name: 'Python', value: 'python' },
                            { name: 'Java', value: 'java' },
                            { name: 'C++', value: 'cpp' },
                            { name: 'HTML/CSS', value: 'html' },
                            { name: 'SQL', value: 'sql' },
                            { name: 'PHP', value: 'php' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('complexity')
                        .setDescription('Code complexity level')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Basic', value: 'basic' },
                            { name: 'Intermediate', value: 'intermediate' },
                            { name: 'Advanced', value: 'advanced' }
                        ))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'ideas':
                await handleIdeasGeneration(interaction);
                break;
            case 'code':
                await handleCodeGeneration(interaction);
                break;
        }
    },
};

async function handleIdeasGeneration(interaction) {
    await interaction.deferReply();

    try {
        const prompt = interaction.options.getString('prompt');
        const tech = interaction.options.getString('tech');
        const difficulty = interaction.options.getString('difficulty');

        let aiPrompt = `Generate 3 unique project ideas based on the following prompt: "${prompt}"`;
        if (tech) aiPrompt += `\nTechnologies to use: ${tech}`;
        if (difficulty) aiPrompt += `\nDifficulty level: ${difficulty}`;

        aiPrompt += `\n\nFor each project idea, provide:
1. Project title
2. Brief description
3. Key features
4. Learning outcomes
5. Potential challenges
6. Estimated time to complete`;

        // Use HuggingFace's text generation
        const result = await hf.textGeneration({
            model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
            inputs: aiPrompt,
            parameters: {
                max_new_tokens: 1000,
                temperature: 0.7,
                top_p: 0.95,
                return_full_text: false,
            }
        });

        const ideas = result.generated_text;
        const ideaSegments = ideas.split(/Project \d+:/g).filter(Boolean);

        const embeds = ideaSegments.map((idea, index) => {
            const fields = [
                { name: 'Prompt', value: prompt, inline: true }
            ];
            
            if (tech) fields.push({ name: 'Technologies', value: tech, inline: true });
            if (difficulty) fields.push({ 
                name: 'Difficulty', 
                value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1), 
                inline: true 
            });

            return new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Project Idea ${index + 1}`)
                .setDescription(idea.trim())
                .addFields(fields)
                .setFooter({ text: `Generated by CodeAscend • Idea ${index + 1}/3` })
                .setTimestamp();
        });

        await interaction.editReply({
            content: 'Here are some project ideas based on your prompt:',
            embeds: embeds
        });
    } catch (error) {
        console.error('Error generating ideas:', error);
        await interaction.editReply({
            content: 'There was an error generating project ideas. Please try again later.',
            ephemeral: true
        });
    }
}

async function handleCodeGeneration(interaction) {
    await interaction.deferReply();

    try {
        const prompt = interaction.options.getString('prompt');
        const language = interaction.options.getString('language');
        const complexity = interaction.options.getString('complexity');

        let codePrompt = `Generate ${language} code for: ${prompt}`;
        if (complexity) codePrompt += `\nComplexity level: ${complexity}`;

        codePrompt += `\n\nPlease provide:
1. Code implementation
2. Brief explanation of how it works
3. Usage example
4. Any important notes or considerations`;

        // Use HuggingFace's code generation model
        const result = await hf.textGeneration({
            model: 'bigcode/starcoder',
            inputs: codePrompt,
            parameters: {
                max_new_tokens: 1000,
                temperature: 0.7,
                top_p: 0.95,
                return_full_text: false,
            }
        });

        const generatedContent = result.generated_text;

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Generated Code Solution')
            .setDescription(generatedContent)
            .addFields(
                { name: 'Language', value: language, inline: true },
                complexity ? { name: 'Complexity', value: complexity, inline: true } : null,
                { name: 'Prompt', value: prompt }
            )
            .setFooter({ text: 'Generated by CodeAscend' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error generating code:', error);
        await interaction.editReply({
            content: 'There was an error generating the code. Please try again later.',
            ephemeral: true
        });
    }
}