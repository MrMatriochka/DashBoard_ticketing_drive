# Hub tickets — contexte projet pour Claude Code

## Objectif
Tableau de bord de suivi de tickets pour une personne qui n'a accès qu'à Google Workspace.
- **Données** : un Google Sheet (source de vérité unique).
- **Application** : une web app Apps Script (HtmlService), développée en local avec `clasp`.
- **Diffusion** : la web app est intégrée dans un Google Site (Insérer → Intégrer → URL `/exec`).
- **Phase actuelle : démonstration avec des données de test.** L'interface doit afficher clairement un bandeau « Données de démonstration » tant que le Sheet contient le jeu de test.

## Manière de travailler avec Valentin (étudiant M2 MIAGE, alternant)
- Répondre en français.
- **Proposer le plan d'une étape et attendre son accord avant d'implémenter.** Avancer par petites briques testables.
- **Expliquer chaque choix technique** : pourquoi cette solution, quelles alternatives ont été écartées. Relier aux notions MIAGE quand c'est pertinent (architecture 3-tiers, intégrité référentielle, concurrence, MVC).
- Valentin préfère souvent taper le code lui-même : par défaut, présenter le code commenté et demander s'il veut que tu l'appliques.
- Il travaille dans IntelliJ : donner les manipulations IDE pour IntelliJ.
- Terminer les étapes importantes par 1 ou 2 conseils « Pour progresser ».
- Ne jamais lancer `clasp create-deployment` / `clasp update-deployment` sans son accord explicite. `clasp push` est autorisé après chaque brique validée.

## Stack et contraintes techniques
- Apps Script, runtime **V8** (ES2019+ côté serveur, mais **pas de modules ES** : pas d'`import`/`export`, toutes les fonctions sont globales).
- Fichiers locaux en `.js` dans `src/` (clasp les convertit en `.gs`), `rootDir: "src"` dans `.clasp.json`.
- Front : HTML/CSS/JS servis par `HtmlService`, assemblés avec le motif `include()` (`<?!= include('Styles') ?>`).
- Appels client → serveur via `google.script.run` (asynchrone, callbacks `withSuccessHandler` / `withFailureHandler`). Envelopper dans une petite fonction qui retourne une `Promise`.
- **Un seul appel `getTickets()` au chargement**, filtres et agrégats calculés côté navigateur. Le serveur ne renvoie que des objets sérialisables (dates converties en chaînes ISO).
- Graphiques et graphe en étoile : **Apache ECharts** (CDN jsdelivr). Graphe = série `type: 'graph'`, `layout: 'force'`.
- Création de ticket protégée par `LockService.getScriptLock()` (génération d'ID sans doublon).
- Validation des données **côté serveur** (statut, catégorie, personne doivent exister dans les référentiels), même si le formulaire contrôle déjà.
- `doGet()` : `HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Hub tickets').addMetaTag('viewport', 'width=device-width, initial-scale=1')`. Ajouter `setXFrameOptionsMode(ALLOWALL)` seulement si l'intégration Sites l'exige, et l'expliquer.

## Arborescence cible
```
hub-tickets/
├─ CLAUDE.md
├─ .clasp.json          (rootDir: "src")
├─ .gitignore           (.clasp.json, .clasprc.json, node_modules/)
├─ package.json         (devDependency @types/google-apps-script)
└─ src/
   ├─ appsscript.json   (timeZone Europe/Paris, runtimeVersion V8, webapp)
   ├─ Code.js           (doGet, include, API publique)
   ├─ Repository.js     (lecture/écriture du Sheet)
   ├─ Setup.js          (setupSheets, seedDemoData, resetDemo)
   ├─ Index.html
   ├─ Styles.html
   ├─ App.html          (état, filtres, rendu des vues)
   └─ Charts.html       (configurations ECharts)
```

## Modèle de données (Google Sheet)
Feuille **Tickets** (ligne 1 = en-têtes, une ligne = un ticket) :

| Colonne | Type | Règle |
|---|---|---|
| ID | texte | `TK-001`, généré serveur |
| Créé le | date | auto |
| Titre | texte | obligatoire |
| Description | texte long | |
| Catégorie | liste | référentiel |
| Priorité | liste | Haute / Moyenne / Basse |
| Demandeur | liste | référentiel Personnes |
| Assigné à | liste | référentiel Personnes |
| Statut | liste | voir cycle de vie |
| Mis à jour le | date | auto à chaque modification via l'app |
| Motif | texte | obligatoire si statut = Bloqué ou Rejeté |

Feuille **Référentiels** : colonnes Personnes, Catégories, Statuts, Priorités. Les listes déroulantes du Sheet (validation de données) pointent dessus.

La saisie se fait **soit via le formulaire de l'app, soit en collant des lignes dans le Sheet**. L'app doit tolérer des lignes saisies à la main (ID ou dates manquants → signaler, ne pas planter).

## Cycle de vie des statuts (liste fermée, dans cet ordre)
`À valider` → `Validé` → `En cours` → `Terminé`
- `À valider` → `Rejeté`
- `En cours` ⇄ `Bloqué`

## Vues
1. **Dashboard** : KPI (ouverts, en cours, bloqués, terminés sur 30 jours), anneau par statut, barres empilées statut × personne assignée, barres par catégorie, liste « bloqués et plus anciens ». Filtres globaux : personne, catégorie, période.
2. **Graphe** (vue « Graphify ») : nœud central « Hub », branches = **statuts** par défaut, feuilles = tickets. Sélecteur « Grouper par » : statut / catégorie / personne. Taille de feuille = priorité. Couleur de feuille = statut (ou catégorie quand on groupe par statut, pour ne pas doubler l'information). Clic sur un ticket → fiche détaillée. Zoom et déplacement activés.
3. **Tickets** : liste filtrable, fiche détaillée (changement de statut avec motif), formulaire « Nouveau ticket ».

## Charte graphique
Style **grande entreprise aéronautique** : sobre, bleu marine dominant, beaucoup d'air. Palette *inspirée* de ce registre, sans reprendre aucun logo, nom ou élément de marque réel.
Effet : **néomorphisme doux** sur les cartes (ombres claires/foncées très légères sur fond gris-bleu), en gardant un **contraste texte AA** (le néomorphisme pur rend les contrôles peu lisibles : bordures fines ou états actifs marqués en bleu pour compenser).

Jetons CSS de départ (`:root`), à ajuster :
```
--navy-900: #0B1F4B;   /* en-tête, titres */
--navy-700: #1C3D7A;
--blue-500: #2F6FD0;   /* actions, liens, focus */
--sky-300:  #8FBCEB;
--surface:  #E9EEF5;   /* fond néomorphique */
--card:     #EEF2F8;
--shadow-dark:  rgba(163,177,198,.55);
--shadow-light: rgba(255,255,255,.9);
--text:     #1A2333;
--text-muted:#5B6678;
/* statuts */
--st-a-valider: #8A94A6;
--st-valide:    #3D7DD8;
--st-en-cours:  #5B5FC7;
--st-bloque:    #D2544E;
--st-termine:   #1F9E89;
--st-rejete:    #4A4F5A;
```
Typographie : Inter (Google Fonts), 400/500, chiffres tabulaires pour les KPI.
Responsive : utilisable à 375 px de large (l'iframe Sites peut être étroite).

## Données de démonstration
`seedDemoData()` crée ~25 tickets fictifs répartis sur tous les statuts, 4 catégories génériques (ex. Données, Automatisation, Support, Formation) et 4 personnes fictives (prénoms inventés). Toutes les descriptions commencent par « [DÉMO] ». `resetDemo()` vide la feuille Tickets et rejoue le seed.

## Ordre de construction proposé
1. Initialisation clasp + `appsscript.json` + `Setup.js` (création des feuilles, référentiels, validations, seed) → vérifier dans le Sheet.
2. `Repository.js` + `getTickets()` + `doGet()` minimal qui affiche le JSON → test via déploiement de test `/dev`.
3. Squelette `Index.html` + charte (jetons, cartes, navigation 3 vues).
4. Dashboard (KPI, puis graphiques un par un).
5. Vue Graphe.
6. Vue Tickets + création / changement de statut (LockService, validation serveur).
7. Déploiement versionné, intégration dans Google Sites.
