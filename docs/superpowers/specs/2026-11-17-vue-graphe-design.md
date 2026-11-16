# Étape 5 — Vue Graphe (arbre à deux côtés)

## Intention
Voir d'un coup d'œil **comment le travail en cours se répartit** (par statut, catégorie ou personne), puis zoomer sur une branche pour lire les tickets et ouvrir leur fiche. Complète le Dashboard (chiffres) par une vue spatiale.

## Objectifs / non-objectifs / anti-objectifs
- **Objectifs** : arbre Hub → branches → cartes, branches réparties à gauche et à droite ; « Grouper par » statut / catégorie / personne ; interrupteur « Afficher les clos » ; mêmes filtres globaux que le Dashboard ; zoom / déplacement ; vue d'ensemble quand on dézoome ; **fiche détaillée en lecture seule** dans un panneau latéral.
- **Non-objectifs** : modifier un ticket depuis la fiche (chantier « écriture ») ; liste des tickets (chantier suivant) ; glisser une carte d'une branche à l'autre.
- **Anti-objectifs** : du texte illisible ou qui déborde ; des liens qui passent devant les cartes ; une carte qu'on ne peut pas cliquer ; une dépendance externe.

## Contraintes
Dépendances minimales (réseau cloisonné) ; 375 px ; contraste AA ; texte du Sheet échappé ; calcul côté navigateur à partir de l'unique `getTickets()`.

## Approches
1. **Arbre en HTML/CSS + zoom maison** — retenue (validée par Valentin sur le prototype v3) : texte net à tout zoom, cartes = vrais boutons, aucune dépendance.
2. ECharts (`graph` force ou `tree`) — écartée après essai : un seul côté pour `tree`, textes qui ne suivent pas le zoom, cartes illisibles.
3. Bibliothèque de graphes (D3…) — écartée : dépendance externe.

## Décisions de Valentin (prototypes v1 → v3)
- Tickets **ouverts** par défaut + interrupteur **« Afficher les clos »**.
- Le graphe suit les **filtres globaux** (personne assignée, catégorie, période) du Dashboard.
- Disposition **arbre**, **des deux côtés** du Hub.
- Tickets affichés en **cartes** : ID, priorité (écrite, « Haute » en rouge), titre sur **une ligne tronquée**, statut (pastille) · âge en jours. La priorité est **écrite** au lieu de jouer sur la taille (écart assumé avec le CLAUDE.md).
- **Liens derrière les cartes.**
- **Vue d'ensemble** sous 60 % de zoom : seuls le Hub (total) et les branches (nombre de tickets + résumé « N hautes · N bloqués ») restent visibles, agrandis pour rester lisibles ; clic sur une branche = zoom dessus.
- Fiche en **panneau latéral** (le graphe reste visible à côté).

## Référence visuelle
Prototype validé : `docs/superpowers/maquettes/2026-11-17-graphe-v3.html` (s'ouvre seul dans un navigateur, données du seed). Géométrie : le Hub au centre ; de chaque côté, les branches **empilées verticalement** ; chaque branche a son bloc de cartes (2 colonnes) **du côté extérieur** ; liens courbes **Hub → branche** et **branche → chaque carte**, dessinés derrière les cartes (les liens vers les cartes disparaissent en vue d'ensemble).

## Comportement
- **« Personne » = la personne assignée** *(choix de Claude, cohérent avec le filtre et les barres de l'étape 4)* ; groupe vide « Non assigné ».
- **« Afficher les clos »** masque seulement Terminé et Rejeté *(choix de Claude)* : un ticket au statut inconnu reste visible (branche « Hors référentiel » quand on groupe par statut), pour que les anomalies de saisie se voient.
- **Contrôles partagés** *(choix de Claude)* : la barre de filtres (personne, catégorie, période) est commune au Dashboard et au Graphe, placée au-dessus des deux vues et masquée sur la vue Tickets pour l'instant ; « Grouper par » et « Afficher les clos » n'appartiennent qu'au Graphe.
- **Panneau de la fiche** *(choix de Claude)* : il **recouvre** le bord droit du graphe sans le redimensionner ni le réajuster.
- **Branches** : valeurs du référentiel du regroupement, dans son ordre, seulement celles qui ont des tickets ; plus « Non assigné » / « Sans catégorie » / « Hors référentiel » selon les règles de l'étape 4 (même fonction `groupe`).
- **Répartition gauche / droite** : branches triées par nombre de tickets décroissant, chacune posée du côté qui en a le moins (égalité → droite). Ordre d'affichage de chaque côté = cet ordre.
- **Cartes d'une branche** : 2 colonnes ; triées par priorité (Haute → Basse), puis du plus ancien au plus récent.
- **Couleurs** : branche = couleur du statut quand on groupe par statut, sinon bleu marine ; bordure gauche de la carte = **catégorie** quand on groupe par statut, sinon **statut**. Couleurs de catégorie : palette fixe de 6 teintes attribuées dans l'ordre du référentiel (cyclique). Légende sous le graphe.
- **Zoom** : molette (centrée sur le pointeur), pincement à deux doigts, boutons − / + / Ajuster ; bornes 40 % – 160 % ; à l'ouverture et à chaque changement de regroupement ou de filtre : « Ajuster » (tout visible, sans dépasser 100 %). Indicateur « Détail · 67 % » / « Vue d'ensemble · 40 % ».
- **Déplacement** : glisser ; le glissement ne commence qu'au-delà de 5 px (sinon c'est un clic).
- **Fiche** : clic ou Entrée sur une carte → panneau à droite (360 px ; pleine largeur sous 600 px) : ID, titre complet, statut, priorité, catégorie, demandeur, assigné, créé le, mis à jour le (dates en `fr-FR`), motif s'il existe, description ; bouton Fermer et touche Échap ; le focus va dans le panneau à l'ouverture et revient sur la carte à la fermeture.
- **Aucun ticket** après filtres : message « Aucun ticket pour ces filtres ».

## Fichiers
- `src/Stats.html` : + fonctions pures `brancher(tickets, cle, connus, libelleVide, maintenant)` → `[{ nom, tickets (triés), n, hautes, bloques }]` et `repartir(branches)` → `{ gauche, droite }` ; testées dans `tests/Stats.test.js`.
- `src/Graphe.html` (nouveau) : rendu de l'arbre, liens SVG (calculés en coordonnées non zoomées), zoom / déplacement / vue d'ensemble.
- `src/Fiche.html` (nouveau) : `ouvrirFiche(ticket, elementOrigine)` / `fermerFiche()` — réutilisée par la liste des tickets ensuite.
- `src/App.html` : la barre de filtres sort du Dashboard pour être partagée avec le Graphe ; branchement de la vue Graphe (rendue seulement quand elle est visible, comme le Dashboard).
- `src/Styles.html`, `src/Index.html` (inclusions `Graphe`, `Fiche`).

## Vérification
`npm test` ; aperçu local sur le seed ; puis `/dev` : regroupements, clos, filtres, zoom molette / boutons, vue d'ensemble, clic branche, clic et Entrée sur une carte, Échap, 375 px.

## Laissé au constructeur
Dimensions exactes, espacements, teintes de la palette des catégories (contraste non requis : aucun texte dessus), courbure des liens, animations.
