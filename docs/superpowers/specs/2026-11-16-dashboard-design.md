# Étape 4 — Dashboard

## Intention
Donner au responsable, en un coup d'œil, l'état des tickets et **ce qu'il faut relancer**, et lui permettre de voir **si l'équipe avance mieux que les 30 jours précédents**. Tout est calculé dans le navigateur à partir de l'unique `getTickets()` (étape 2), dans la coquille de l'étape 3.

## Objectifs / non-objectifs / anti-objectifs
- **Objectifs** : 6 KPI ; carte de comparaison 30 j / 30 j ; liste « à traiter » ; anneau par statut ; barres empilées statut × personne assignée ; barres par catégorie ; filtres globaux personne / catégorie / période ; ECharts embarqué (aucun CDN).
- **Non-objectifs** : clic sur un graphique ou une ligne (la fiche détaillée arrive à l'étape 6) ; historisation des statuts ; comparaison d'**états** passés (« bloqués fin octobre ») — impossible sans historique.
- **Anti-objectifs** : un KPI faux qui passe inaperçu (d'où les tests) ; une page vide en réseau cloisonné (d'où ECharts embarqué) ; une flèche « mieux / moins bien » trompeuse.

## Contraintes
- Dépendances minimales, environnement possiblement cloisonné (Valentin) : aucune ressource chargée depuis un CDN pour les graphiques.
- 375 px minimum ; contraste AA ; texte du Sheet échappé avant toute insertion HTML.
- Calculs côté navigateur (CLAUDE.md) ; un seul appel serveur au chargement.

## Approches
**Bibliothèque de graphiques** (choix de Valentin : B)
- A. ECharts par CDN — écartée : aucun graphique si jsdelivr est filtré.
- **B. ECharts embarqué dans le projet** — retenue : marche partout où Google marche, resservira au graphe de l'étape 5 ; coût ≈ 1 Mo par chargement (≈ 300 Ko compressé).
- C. SVG à la main — écartée : faisable pour le Dashboard, mais l'étape 5 (forces, zoom, déplacement) deviendrait un gros chantier.

**Embarquement** (choix de Valentin : 1a) — `echarts` en `devDependency` à **version exacte** (6.1.0, Apache-2.0), script `npm run vendor` qui écrit `src/Vendor.html` = `<script>` + en-tête de licence + `node_modules/echarts/dist/echarts.min.js` + `</script>`. Écarté : copie manuelle (version non tracée).

**Calculs** (choix de Valentin : 2a) — fonctions pures sans DOM dans `src/Stats.html`, testées en Node en extrayant le `<script>` ; `Charts.html` et `App.html` ne font que dessiner. Écartés : tout dans `App.html` (KPI jamais testés) ; calcul serveur (contraire au CLAUDE.md, aller-retour à chaque filtre).

## Décisions de Valentin
- Disposition **B « Action d'abord »** : filtres → 6 KPI → comparaison → [liste à traiter | anneau] → [barres empilées | barres catégorie]. En 375 px : une colonne, KPI en 2 colonnes × 3 lignes.
- KPI : **Ouverts, À valider, En cours, Bloqués, Dormants > 14 j, Terminés (30 j)**. « Bloqués » mis en avant en rouge.
- Comparaison : **30 jours glissants vs les 30 jours précédents**.

## Règles de calcul (`src/Stats.html`, toutes pures, `maintenant` passé en paramètre)
- Statuts **ouverts** = À valider, Validé, En cours, Bloqué. Clos = Terminé, Rejeté. Un statut inconnu (anomalie) n'est compté nulle part sauf dans le compteur total de l'en-tête.
- **Ouverts / À valider / En cours / Bloqués** : comptages par statut.
- **Dormants** : ouvert et dernière activité (`majLe`, sinon `creeLe`) il y a **plus de 14 jours** ; sans aucune date → non compté.
- **Terminés (30 j)** : statut Terminé et `majLe` dans les 30 derniers jours (approximation : `majLe` tient lieu de date de clôture).
- **Comparaison** : fenêtre actuelle = ]maintenant − 30 j, maintenant], précédente = ]maintenant − 60 j, maintenant − 30 j]. Créés = `creeLe` dans la fenêtre ; Terminés = statut Terminé et `majLe` dans la fenêtre ; Solde = Terminés − Créés. Évolution : Terminés et Solde → plus haut = mieux (vert ▲), plus bas = moins bien (rouge ▼), égal = neutre ; Créés → toujours neutre. Le sens est aussi écrit (signe et « vs N »), pas seulement codé par la couleur.
- **Filtres** : personne = **assigné à** ; catégorie ; période = `creeLe` dans les 7 / 30 / 90 derniers jours, ou Tout (défaut). Avec une période active, un ticket sans `creeLe` est exclu. Les filtres personne et catégorie s'appliquent à tout ; la période s'applique à tout **sauf** « Terminés (30 j) » et la comparaison, qui ont leur propre fenêtre.
- **À traiter** : 5 tickets ouverts maximum ; les Bloqués d'abord, puis par `creeLe` croissant (sans date en dernier). Affiché : ID, titre, statut, âge (« 30 j »).
- **Agrégats graphiques** : par statut (ordre des référentiels) ; statut × personne assignée (personnes des référentiels, plus « Non assigné » s'il y en a) ; par catégorie (catégories des référentiels).
- `echapper(texte)` : remplace `& < > " '` par leurs entités.
- **Mesure du temps** *(choix de Claude)* : âge en jours = `Math.floor((maintenant − date) / 86 400 000)`, en millisecondes exactes, sans calendrier ni fuseau. « Plus de 14 jours » = âge ≥ 15 ; « dans les 30 derniers jours » = `maintenant − date < 30 j`. Les tests passent un `maintenant` fixe, donc les valeurs attendues sont stables.
- **Hors référentiel** *(choix de Claude)* : dans les barres statut × personne et par catégorie, un ticket dont l'assigné ou la catégorie est vide ou absent des référentiels va dans une barre **« Non assigné »** (personne vide), **« Hors référentiel »** (personne ou catégorie inconnue) ou **« Sans catégorie »**. Ces barres n'apparaissent que si elles contiennent au moins un ticket. Ainsi la somme des barres = le nombre de tickets filtrés : aucun ticket ne disparaît des graphiques.
- **Âge affiché dans « À traiter »** *(choix de Claude)* : depuis la **création** (`creeLe`), cohérent avec le tri « plus anciens » ; « — » si la date manque.

## Fichiers
- `package.json` : `echarts` 6.1.0 exact en devDependency ; script `vendor`.
- `src/Vendor.html` : généré, committé (clasp doit le pousser), jamais modifié à la main.
- `src/Stats.html` : fonctions pures ci-dessus.
- `src/Charts.html` : construit les options ECharts (anneau `type: 'pie'` avec rayon intérieur, barres horizontales empilées, barres) à partir des agrégats ; couleurs lues dans les jetons CSS `--st-*` ; redimensionnement à la fenêtre.
- `src/App.html` : barre de filtres (remplie depuis `referentiels`), rendu des KPI, de la comparaison, de la liste et des graphiques dans `vue-dashboard` ; `afficher()` recalcule à chaque changement de filtre. Remplace le texte d'attente du Dashboard.
- `src/Index.html` : inclut `Vendor`, `Stats`, `Charts` avant `App`.
- `src/Styles.html` : grille du Dashboard, KPI, comparaison, état « Aucun ticket ».
- `tests/Stats.test.js` : tests des règles de calcul.

## Cas limites attendus
- Filtres qui ne laissent aucun ticket : KPI à 0, graphiques remplacés par « Aucun ticket pour ces filtres », pas d'erreur.
- Ticket sans date, sans assigné ou avec un statut inconnu : n'arrête rien ; traité selon les règles ci-dessus.

## Ordre et risque ECharts *(choix de Claude)*
La toute première tâche génère `Vendor.html` et le pousse avec `clasp push`, avant de construire quoi que ce soit dessus. Si Apps Script refuse ou tronque le fichier, on s'arrête et on revient vers Valentin (les replis possibles — build ECharts réduit, découpage, CDN — changent tous le projet ou la contrainte réseau).

## Vérification
`npm test` (règles de calcul) ; `clasp push` du `Vendor.html` d'environ 1 Mo (première tâche) ; `/dev` sur la démo : Ouverts 18, À valider 5, En cours 6, Bloqués 3, Dormants et Terminés (30 j) cohérents avec les dates du seed ; filtres ; 375 px ; aucun appel réseau vers un CDN de graphiques (onglet Réseau).

## Laissé au constructeur
Tailles, espacements, libellés exacts, animations ECharts (sobres), infobulles des graphiques.
