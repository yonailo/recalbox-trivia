const { Client, Events, GatewayIntentBits } = require('discord.js');

require('dotenv').config();
const BOT_TOKEN = process.env.BOT_TOKEN;

// Charger les questions depuis un fichier JSON
const questions = JSON.parse(require('fs').readFileSync('./ddbb_fr.json', 'utf-8')).questions;
const numPlayers = 10; // Nombre minimum de joueurs
const numQuestions = 20; // Nombre de questions par partie
const timeoutReponse = 20; // 20 secondes pour répondre;

// Variables pour le Trivia
let registeredUsers = []; // Liste temporaire des joueurs inscrits
let scores = {}; // Suivre les scores des joueurs pendant la partie
let gameInProgress = false; // Empêcher plusieurs parties simultanées

// Fonction pour reset les variables du jeu
function reset_game() {
    registeredUsers = [];
    scores = {};
    gameInProgress = false;
}

// Fonction pour sélectionner une question aléatoire
function getRandomQuestion() {
    const randomIndex = Math.floor(Math.random() * questions.length);
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
        await channel.send(`**Question ${i + 1} :** ${question.question}\n`);

        const filter = (response) => {
            return registeredUsers.includes(response.author.id);
        };

        const collector = channel.createMessageCollector({ filter, time: timeoutReponse * 1000}); // X secondes pour répondre

        let questionAnswered = false;

        collector.on('collect', (response) => {
            if (response.content === question.answer) {
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
});

// Événement : Quand un message est envoyé sur le canal
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Commande : Inscription
    if (message.content.toLowerCase() === '!trivia-join') {
        if (registeredUsers.includes(message.author.id)) {
            return message.reply('❌ Vous êtes déjà inscrit pour cette partie !');
        }
        registeredUsers.push(message.author.id);
        message.reply('✅ Vous êtes maintenant inscrit pour jouer au Trivia Recalbox !');

        // Vérifier si assez de joueurs sont inscrits pour commencer automatiquement
        if (registeredUsers.length >= numPlayers && !gameInProgress) {
            message.channel.send('🎉 ' + numPlayers + ' joueurs sont inscrits ! Le Trivia va commencer automatiquement.');
            startTriviaGame(message.channel);
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
});

client.login(BOT_TOKEN);
