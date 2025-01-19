# Recalbox Trivia

## Fontionnement

Le utilisateurs qui souhaient jouer doivent s'inscrire avec ``rbt-join <nickname>``.

Il faut un minimum de 10 joueurs pour démarrer une partie, quand on arrive à 10, un compte à rebour se déclenche et au bout d'une minute la partie commence.

* Le bot pose une question, les gens inscrits peuvent y répondre, si personne ne trouve la bonne réponse, au bout d'une minute le bot posera une autre question.

* Une partie est composé de 20 questions. Chaque réponse apporte 1 point, celui qui a le plus de points à la fin est déclaré vainqueur.

Le bot utilise un fichier ``ddbb_fr.json``  qui contient une liste de questions - réponses.

Si vous voulez ajouter votre question, merci de créer un issue sur dépôt.