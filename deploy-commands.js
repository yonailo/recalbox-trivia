const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const { SlashCommandBuilder } = require('@discordjs/builders');

const commands = [
    new SlashCommandBuilder()
        .setName('trivia-add-question')
        .setDescription('Add a new trivia question')
        .addStringOption(option => 
            option.setName('question')
                .setDescription('The question text')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('response')
                .setDescription('The response text')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('trivia-edit-question')
        .setDescription('Edit an existing trivia question')
        .addIntegerOption(option => 
            option.setName('id')
                .setDescription('The ID of the question to edit')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('question')
                .setDescription('The new question text')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('response')
                .setDescription('The new response text')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('trivia-start')
        .setDescription('Start a trivia game'),
    new SlashCommandBuilder()
        .setName('trivia-stop')
        .setDescription('Stop the current trivia game'),
    new SlashCommandBuilder()
        .setName('trivia-num-players')
        .setDescription('Sets the minimum number of players to start a game')
        .addIntegerOption(option => 
            option.setName('id')
                .setDescription('The number of players required')
                .setRequired(true)),
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();