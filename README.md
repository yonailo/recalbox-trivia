# Recalbox Trivia

## Fontionnement

Le utilisateurs qui souhaient jouer doivent s'inscrire avec ``!trivia-join <nickname>``.

Il faut un minimum de 10 joueurs pour démarrer une partie, quand on arrive au nombre minimum de joueurs, un compte à rebour se déclenche et au bout d'un certain temps la partie commence.

* Le bot pose une question, les gens inscrits peuvent y répondre, si personne ne trouve la bonne réponse, au bout d'un certain temps le bot posera une autre question.

* Une partie est composé de 20 questions. Chaque réponse apporte 1 point, celui qui a le plus de points à la fin est déclaré vainqueur.

Le bot utilise un fichier ``ddbb_fr.json``  qui contient une liste de questions - réponses en français.

Si vous voulez ajouter d'autres questions, merci de créer un issue sur ce dépôt ou bien me les envoyer sur le [discord de Recalbox](https://discord.gg/NbQFbGM) à @yonailo

## Commandes avec role administrator

* !trivia-start
* !trivia-stop
* !trivia-add-question
* !trivia-edit-question

## Variables d'environment

* BOT_TOKEN
* CHANNEL_NAME