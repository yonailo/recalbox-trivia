# Recalbox Trivia

## Fontionnement

Les utilisateurs qui souhaient jouer doivent s'inscrire avec `!trivia-join <nickname>`.

Il faut un minimum de X joueurs pour démarrer une partie, quand on arrive au nombre minimum de joueurs, un compte à rebour se déclenche et au bout d'un certain temps la partie commence.

* Le bot pose une question, les gens inscrits peuvent y répondre, si personne ne trouve la bonne réponse, au bout d'un certain temps le bot posera une autre question.

* Une partie est composé de 20 questions. Chaque réponse apporte 1 point, celui qui a le plus de points à la fin est déclaré vainqueur.

Le bot utilise un fichier `ddbb_fr.json`  qui contient une liste de questions - réponses en français.

Si vous voulez ajouter d'autres questions, merci de créer un issue sur ce dépôt ou bien me les envoyer sur le [discord de Recalbox](https://discord.gg/NbQFbGM) à @yonailo. Vous pouvez aussi ajouter et editer des questions avec des slash commands si vous avez le role ADMINISTRATOR sur le serveur.

## Slash commands (role administrator)

* `/trivia-start` : demarre la partie même si on n'est pas arrivé au nombre de joueurs requis.
* `/trivia-stop` : arrête la partie
* `/trivia-add-question <question> <reponse>` : ajouter une question à la base de données JSON.
* `/trivia-edit-question <id> <question> <reponse>` : modifie la question avec l'id passé en argument.
* `/trivia-num-players <id>` : configure le nombre minimal de joueurs pour démarrer automatiquement un match.

## Exécution du bot sur votre serveur

D'abord il faut créer un fichier ``config.json`` et ensuite lancer la commande :

```
node ./deploy-commands.js
```

Une fois les slash-commands enregistrés sur votre serveur, il faut créer un fichier d'environment ``.env`` et lancer le bot :

```
node ./trivia_bot.js
```

Dans le repôt vous trouverez les fichiers ``.example.env`` et ``example.config.json``. 

Le bot fonctionne avec Node v22
