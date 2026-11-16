# Étape 3 — Squelette Index.html, charte, navigation

## Intention
Remplacer le JSON brut de `doGet` par la vraie page de l'application : la coquille (en-tête, bandeau démo, navigation, 3 vues vides) dans laquelle les étapes 4 à 6 viendront se loger, avec la charte appliquée dès maintenant.

## Objectifs / non-objectifs / anti-objectifs
- **Objectifs** : `doGet` en HtmlService + `include()` ; charte (jetons, relief, Inter) ; navigation entre Dashboard / Graphe / Tickets ; bandeau « Données de démonstration » piloté par `getTickets().demo` ; chargement unique des données avec états chargement / erreur / prêt.
- **Non-objectifs** : KPI, graphiques, liste, formulaire (étapes 4–6) ; intégration Sites et `setXFrameOptionsMode` (étape 7).
- **Anti-objectifs** : une page illisible (néomorphisme sans contraste) ; une page blanche si le serveur échoue ; une dépendance qui casse en environnement cloisonné.

## Contraintes
- **Dépendances minimales (Valentin)** : l'application peut tourner dans un environnement cloisonné. Aucune bibliothèque front ; toute ressource externe doit avoir un repli.
- Largeur minimale 375 px (iframe Google Sites).
- Contraste texte AA.
- Pas de modules : `App.html` contient un `<script>` classique.

## Approches
1. **JavaScript vanilla** — retenue (choix de Valentin, pour la contrainte de dépendances) : état + fonction `afficher()`, vues basculées par l'attribut `hidden`.
2. Alpine.js par CDN — écartée : dépendance externe, gain seulement aux étapes 4 et 6.
3. Vue / React — écartées : compilation ou CDN lourd.

## Décisions de Valentin
- Navigation **B** : sélecteur néomorphique (rail creusé, bouton actif en relief + liseré bleu), sous l'en-tête, identique sur mobile et grand écran.
- **Relief sur tous les éléments**, en-tête **bleu marine** (`--navy-900`).

## Règles de style (proposées dans la conversation, maquettes validées)
- Ce qu'on **clique** est en relief (`--raised`) : boutons, cartes, lignes, filtres inactifs.
- Ce qu'on **remplit** ou ce qui est **sélectionné** est creusé (`--inset`) : champs, rail de navigation, filtre actif, bandeau démo.
- Lisibilité : bordure fine (`#CBD4E1`) sur champs et boutons ; liseré `--blue-500` sur l'actif et sur `:focus-visible` ; bouton principal plein `--blue-500`, texte blanc.
- Badges de statut : couleur pleine sans relief (jetons `--st-*` du CLAUDE.md).
- Police : Inter (Google Fonts, 400/500/600) **avec repli `system-ui, sans-serif`** si Google Fonts est bloqué ; chiffres tabulaires pour les KPI.

## Fichiers
- `src/Code.js` : `doGet()` exactement comme le CLAUDE.md (`createTemplateFromFile('Index').evaluate().setTitle('Hub tickets').addMetaTag('viewport', 'width=device-width, initial-scale=1')`) ; `include(nom)` → `HtmlService.createHtmlOutputFromFile(nom).getContent()`. Le JSON brut disparaît.
- `src/Index.html` : structure — en-tête (titre + compteur de tickets), bandeau démo (caché par défaut), `<nav>` à 3 boutons, 3 `<section>` (une par vue), zones d'état ; inclut `Styles` et `App`.
- `src/Styles.html` : jetons `:root` du CLAUDE.md + `--raised` / `--inset` ; classes `.card`, `.btn`, `.btn-primary`, `.field`, `.chip`, `.nav`, `.badge`, `.demo` ; mise en page responsive.
- `src/App.html` : `appelServeur(nomFonction, ...args)` → `Promise` (enveloppe de `google.script.run`) ; état `{ vue, donnees }` ; `afficher()` ; `echapper(texte)` pour tout texte venant du Sheet inséré en HTML.

## Comportement
- Au chargement : état « Chargement… » → `getTickets()` une seule fois → « prêt » ou message d'erreur lisible (avec bouton « Réessayer »).
- Prêt : compteur « N tickets » dans l'en-tête, bandeau si `demo`, vue Dashboard par défaut. Chaque vue vide affiche un texte d'attente (« Dashboard — étape 4 », avec le nombre de tickets chargés) pour prouver que les données arrivent.
- Navigation : la vue courante est gardée en mémoire (pas d'URL `#vue`, qui ne marche pas dans l'iframe sandboxée) ; un rechargement revient au Dashboard. Boutons avec `aria-current="page"` sur l'actif.

## Vérification
Pas de test automatisé à cette étape (coquille d'interface ; la seule logique pure, `echapper`, fait une ligne) — vérification manuelle via `/dev` : chargement puis compteur 25, bandeau visible, navigation clavier (Tab + Entrée) avec focus visible, rendu à 375 px (outils développeur du navigateur), erreur simulée (renommer temporairement la feuille Tickets → message + Réessayer), contraste vérifié sur les couleurs de texte.

## Laissé au constructeur
Espacements, rayons, tailles exactes ; textes d'attente ; nom des classes secondaires.
