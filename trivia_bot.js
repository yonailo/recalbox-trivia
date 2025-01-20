const { Client, Events, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

require('dotenv').config();
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_NAME = process.env.CHANNEL_NAME;

// Charger les questions depuis un fichier JSON
const questions = JSON.parse(fs.readFileSync('./ddbb_fr.json', 'utf-8')).questions;
const numPlayers = 10; // Nombre minimum de joueurs
const numQuestions = 20; // Nombre de questions par partie
const timeoutReponse = 20; // 20 secondes pour répondre;

// Variables pour le Trivia
let registeredUsers = []; // Liste temporaire des joueurs inscrits
let scores = {}; // Suivre les scores des joueurs pendant la partie
let gameInProgress = false; // Empêcher plusieurs parties simultanées
let askedQuestions = []; // Suivre les questions déjà posées

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
        if (registeredUsers.length >= numPlayers && !gameInProgress) {
            message.channel.send('🎉 ' + numPlayers + ' joueurs sont inscrits ! Le Trivia va commencer automatiquement dans quelques instants.');
            setTimeout(() => {
                startTriviaGame(message.channel);
            }, 30000); // 30 seconds
        }
        return;
    }

    // Commande : Forcer le début d'une partie (admin uniquement)
    if (message.content.toLowerCase() === '!trivia-start' &&  message.member.permissions.has('ADMINISTRATOR')) {
        startTriviaGame(message.channel);
    }

    // Commande : Arrêter le jeu (admin uniquement)
    if (message.content.toLowerCase() === '!trivia-stop' && message.member.permissions.has('ADMINISTRATOR')) {
        stopTriviaGame(message.channel);
    }

    // Commande : Ajouter une question (admin uniquement)
    if (message.content.toLowerCase().startsWith('!trivia-add-question') && message.member.permissions.has('ADMINISTRATOR')) {
        const args = message.content.slice('!trivia-add-question'.length).trim().split(', ');
        const questionArg = args.find(arg => arg.startsWith('question:'));
        const responseArg = args.find(arg => arg.startsWith('response:'));

        if (questionArg && responseArg) {
            const questionText = questionArg.slice('question:'.length).trim();
            const responseText = responseArg.slice('response:'.length).trim();

            if (questionText && responseText) {
                const newId = questions.length ? questions[questions.length - 1].id + 1 : 1;
                questions.push({ id: newId, question: questionText, answer: responseText });
                fs.writeFileSync('./ddbb_fr.json', JSON.stringify({ questions }, null, 2));
                message.reply('✅ Question ajoutée avec succès avec id ' + newId + ' !');
            } else {
                message.reply('❌ Format incorrect. Utilisez `!trivia-add-question question:<text>, response:<text>`.');
            }
        } else {
            message.reply('❌ Format incorrect. Utilisez `!trivia-add-question question:<text>, response:<text>`.');
        }
    }

    // Commande : Modifier une question (admin uniquement)
    if (message.content.toLowerCase().startsWith('!trivia-edit-question') && message.member.permissions.has('ADMINISTRATOR')) {
        const args = message.content.slice('!trivia-edit-question'.length).trim().split(', ');
        const idArg = args.find(arg => arg.startsWith('id:'));
        const questionArg = args.find(arg => arg.startsWith('question:'));
        const responseArg = args.find(arg => arg.startsWith('response:'));

        if (idArg && questionArg && responseArg) {
            const id = parseInt(idArg.slice('id:'.length).trim(), 10);
            const questionText = questionArg.slice('question:'.length).trim();
            const responseText = responseArg.slice('response:'.length).trim();

            const questionIndex = questions.findIndex(q => q.id === id);
            if (questionIndex !== -1) {
                questions[questionIndex].question = questionText;
                questions[questionIndex].answer = responseText;
                fs.writeFileSync('./ddbb_fr.json', JSON.stringify({ questions }, null, 2));
                message.reply('✅ Question modifiée avec succès !');
            } 
            else {
                message.reply('❌ Question avec id ' + id + ' non trouvée.');
            }
        } 
        else {
            message.reply('❌ Format incorrect. Utilisez `!trivia-edit-question id:<id>, question:<text>, response:<text>`.');
        }
    }
});

client.login(BOT_TOKEN);
