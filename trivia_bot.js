const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');

require('dotenv').config();
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_NAME = process.env.CHANNEL_NAME;

// Charger les questions depuis un fichier JSON
const questions = JSON.parse(fs.readFileSync('./ddbb_fr.json', 'utf-8')).questions;
const numQuestions = 20; // Nombre de questions par partie
const timeoutReponse = 20; // 20 secondes pour répondre;
const waitBeforeStart = 30; // 30 secondes avant de commencer la partie quand on atteint le nombre de joueurs.

// Variables pour le Trivia
let registeredUsers = []; // Liste temporaire des joueurs inscrits.
let scores = {}; // Suivre les scores des joueurs pendant la partie.
let gameInProgress = false; // Empêcher plusieurs parties simultanées.
let askedQuestions = []; // Suivre les questions déjà posées.
let numPlayers = 1; // Nombre minimum de joueurs, configurable via une slash command.

// Fonction pour reset les variables du jeu
function reset_game() {
    registeredUsers = [];
    scores = {};
    gameInProgress = false;
    askedQuestions = [];
}

// Fonction pour sélectionner une question aléatoire
function getRandomQuestion() {
    if (askedQuestions.length === questions.length) {
        // Toutes les questions ont été posées
        askedQuestions = [];
    }

    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * questions.length);
    } while (askedQuestions.includes(randomIndex));

    askedQuestions.push(randomIndex);
    return questions[randomIndex];
}

// Fonction pour arrêter l'exécution pendant "duration" secondes.
function pause(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration * 1000));
}

// Function to stop the trivia game
function stopTriviaGame(channel) {
    if (!gameInProgress) {
        channel.send('❌ Aucun jeu en cours à arrêter.');
        return;
    }

    reset_game();
    channel.send('🛑 Le jeu de Trivia a été arrêté.');
}

function scheduleStartIfPossible(channel) {
    if (registeredUsers.length >= numPlayers && !gameInProgress) {
        channel.send('🎉 ' + numPlayers + ' joueurs sont inscrits ! Le Trivia va commencer automatiquement dans quelques instants.');
        setTimeout(() => {
            startTriviaGame(channel);
        }, waitBeforeStart * 1000); // X seconds
    }
}


// Fonction pour démarrer une partie de Trivia
async function startTriviaGame(channel) {
    if (gameInProgress) {
        return channel.send('❌ Une partie est déjà en cours !');
    }

    gameInProgress = true;
    scores = {}; // Réinitialiser les scores

    // Initialiser les scores pour tous les joueurs inscrits
    registeredUsers.forEach((userId) => {
        scores[userId] = 0;
    });

    channel.send('🎉 Le Trivia commence maintenant ! ' + numQuestions + ' questions vont être posées. Préparez-vous !');

    for (let i = 0; i < numQuestions; i++) {
        // Check if the game should continue
        if (!gameInProgress) {
            break;
        }

        const question = getRandomQuestion();
        await channel.send(`**Question ${i + 1} :** ${question.question} ||id: ${question.id}||\n`);

        const filter = (response) => {
            return registeredUsers.includes(response.author.id);
        };

        const collector = channel.createMessageCollector({ filter, time: timeoutReponse * 1000}); // X secondes pour répondre

        let questionAnswered = false;

        collector.on('collect', (response) => {
            if (response.content.toLowerCase() === question.answer.toLowerCase()) {
                scores[response.author.id] += 1;
                response.reply(`🎉 Bonne réponse, ${response.author.username} ! Vous gagnez 1 point.`);
                questionAnswered = true;
                collector.stop(); // Stopper après une bonne réponse
            }
        });

        collector.on('end', (collected) => {
            if (!questionAnswered) {
                channel.send(`⏰ Temps écoulé !`);
            }
        });

        // Attendre la fin de la collecte avant de passer à la prochaine question
        if(!questionAnswered) {
            await new Promise((resolve) => {
                collector.on('end', resolve);
            });
        }

        // petite pause entre les questions
        await pause(5);
    }

    if(gameInProgress) {
        // Déterminer le vainqueur
        const winnerId = Object.keys(scores).reduce((winner, userId) => {
            return scores[userId] > (scores[winner] || 0) ? userId : winner;
        }, null);

        const winnerScore = scores[winnerId];
        const winnerTag = (await channel.guild.members.fetch(winnerId)).user.tag;

        channel.send('🏆 Le Trivia est terminé !');
        channel.send(`🎉 Le vainqueur est **${winnerTag}** avec **${winnerScore} points** !`);

        // Réinitialiser les variables de jeu
        reset_game();

        // Anoncer que le prochain match peut commencer.
        channel.send('📝 Les inscriptions sont à nouveau ouvertes ! Tapez `!trivia-join` pour rejoindre la prochaine partie.');
    }
}

// Créer une instance du client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Collection();

// Événement : Quand le bot est prêt
client.once(Events.ClientReady, readyClient => {
	console.log(`Connecté en tant que ${readyClient.user.tag}`);

    // Fetch the channel by name
    const guild = client.guilds.cache.first();
    triviaChannel = guild.channels.cache.find(channel => channel.name === CHANNEL_NAME);
    if (!triviaChannel) {
        console.error(`Channel with name ${CHANNEL_NAME} not found`);
    } 
    else {
        // Send an announcement every 5 minutes, unless a game is in progress or if
        // the last message was sent by the bot itself.
        setInterval(async () => {
            if(! gameInProgress) {
                const messages = await triviaChannel.messages.fetch({ limit: 1 });
                const lastMessage = messages.first();
        
                if (!lastMessage || lastMessage.author.id !== client.user.id) {
                    triviaChannel.send('📝 Tapez `!trivia-join` pour rejoindre la prochaine partie. Il manque au moins ' + (numPlayers - registeredUsers.length) + ' joueurs pour pouvoir commencer.');
                }
            }
        }, 300000); // toutes les 5 minutes
    }
});

// Événement : Quand un message est envoyé sur le canal
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Vérifier si le message provient du canal spécifié
    if (message.channel.name !== CHANNEL_NAME) return;

    // Commande : Inscription
    if (message.content.toLowerCase() === '!trivia-join') {
        if (registeredUsers.includes(message.author.id)) {
            return message.reply('❌ Vous êtes déjà inscrit pour cette partie !');
        }
        registeredUsers.push(message.author.id);
        message.reply('✅ Vous êtes maintenant inscrit pour jouer au Trivia Recalbox !');

        // Vérifier si assez de joueurs sont inscrits pour commencer automatiquement
        scheduleStartIfPossible(message.channel);
        return;
    }
});

// Événement : Quand une interaction est créée
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'trivia-add-question') {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('❌ Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        const questionText = interaction.options.getString('question');
        const responseText = interaction.options.getString('response');

        const newId = questions.length ? questions[questions.length - 1].id + 1 : 1;
        questions.push({ id: newId, question: questionText, answer: responseText });
        fs.writeFileSync('./ddbb_fr.json', JSON.stringify({ questions }, null, 2));
        await interaction.reply('✅ Question ajoutée avec succès avec id ' + newId + ' !');
    } 
    else if (commandName === 'trivia-edit-question') {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('❌ Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        const id = interaction.options.getInteger('id');
        const questionText = interaction.options.getString('question');
        const responseText = interaction.options.getString('response');

        const questionIndex = questions.findIndex(q => q.id === id);
        if (questionIndex !== -1) {
            questions[questionIndex].question = questionText;
            questions[questionIndex].answer = responseText;
            fs.writeFileSync('./ddbb_fr.json', JSON.stringify({ questions }, null, 2));
            await interaction.reply('✅ Question modifiée avec succès !');
        } else {
            await interaction.reply('❌ Question avec id ' + id + ' non trouvée.');
        }
    } 
    else if (commandName === 'trivia-start') {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('❌ Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        startTriviaGame(interaction.channel);
        //await interaction.reply('✅ Le jeu de Trivia a commencé !');
    } 
    else if (commandName === 'trivia-stop') {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('❌ Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        stopTriviaGame(interaction.channel);
        //await interaction.reply('✅ Le jeu de Trivia a été arrêté.');
    }
    else if (commandName === 'trivia-num-players') {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('❌ Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        numPlayers = interaction.options.getInteger('id');
        scheduleStartIfPossible(interaction.channel);

        await interaction.reply('✅ Le nombre de joueurs minimum est passé à ' + interaction.options.getInteger('id') + '.');
    }
});


client.login(BOT_TOKEN);
