# Dashboard — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** la vue Dashboard affiche 6 KPI, la comparaison 30 j / 30 j, la liste « à traiter », 3 graphiques ECharts embarqués et des filtres globaux, tous calculés dans le navigateur.

**Architecture :** `Vendor.html` (ECharts généré par `npm run vendor`) → `Stats.html` (fonctions pures, testées en Node) → `Charts.html` (options ECharts) → `App.html` (filtres, rendu). Inclus dans cet ordre par `Index.html`.

**Tech Stack :** Apps Script HtmlService, JavaScript vanilla, ECharts 6.1.0 embarqué, `node:test` + `node:vm`.

**Spec :** `docs/superpowers/specs/2026-11-16-dashboard-design.md`

## Global Constraints
- Aucun chargement de graphiques depuis un CDN ; `echarts` fixé à **6.1.0** exact (devDependency).
- Fonctions de `Stats.html` pures : aucun accès au DOM ni à `Date.now()` ; `maintenant` (objet `Date`) toujours passé en paramètre.
- Âge en jours = `Math.floor((maintenant − date) / 86 400 000)` ; dormant = ouvert et âge de la dernière activité ≥ 15 ; « dans les 30 derniers jours » = `maintenant − date < 30 j`.
- Statuts ouverts : `À valider`, `Validé`, `En cours`, `Bloqué` ; clos : `Terminé`, `Rejeté`.
- Libellés de regroupement exacts : `Non assigné`, `Hors référentiel`, `Sans catégorie`.
- Tout texte venant du Sheet inséré en HTML passe par `echapper()` ou `textContent`.
- 375 px sans défilement horizontal ; contraste AA ; le sens d'une évolution est aussi écrit (signe, « vs N »), pas seulement en couleur.

## Review Focus
1. Filtres qui ne laissent aucun ticket → KPI à 0, graphiques remplacés par « Aucun ticket pour ces filtres », aucune erreur console (Task 3, vérification).
2. Redimensionnement de la fenêtre / 375 px → les graphiques suivent la largeur (`resize`), pas de débordement (Task 3, vérification).
3. Titre de ticket contenant `<b>` ou `<img onerror>` → affiché tel quel dans « À traiter » (test `echapper` en Task 2 + vérification Task 3).
4. `Vendor.html` d'environ 1 Mo refusé ou tronqué par `clasp push` → arrêt et question à Valentin (Task 1).
5. Ticket au statut inconnu → compté dans le total de l'en-tête, absent des KPI par statut et de l'anneau, sans erreur (test en Task 2).

---

### Task 1 : ECharts embarqué (`npm run vendor`) et poussé

**Files :**
- Modify : `package.json` (devDependency `"echarts": "6.1.0"`, script `"vendor": "node scripts/vendor.js"`)
- Create : `scripts/vendor.js`, `src/Vendor.html` (généré), `tests/Vendor.test.js`
- Modify : `src/Index.html` (`<?!= include('Vendor') ?>` juste avant `<?!= include('App') ?>`)

**Interfaces :**
- Produces : global navigateur `echarts` (API ECharts 6).

- [ ] **Step 1 : test** `tests/Vendor.test.js` — `Vendor.html est généré depuis echarts 6.1.0` : le fichier commence par `<script>`, finit par `</script>\n`, contient `Apache License` et la chaîne `6.1.0`, et ne contient aucune URL `cdn.` ni `jsdelivr`.
- [ ] **Step 2 :** `npm test` → FAIL (fichier absent).
- [ ] **Step 3 :** `npm install --save-dev --save-exact echarts@6.1.0` ; `scripts/vendor.js` lit `node_modules/echarts/dist/echarts.min.js` et écrit `src/Vendor.html` = `<script>\n/* ECharts 6.1.0 — Apache License 2.0 — fichier généré par npm run vendor, ne pas modifier */\n` + contenu + `\n</script>\n`. `npm run vendor`.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 :** `clasp push`. Expected : `Vendor.html` listé, aucune erreur. **Si erreur ou fichier tronqué : arrêter et demander à Valentin.** Puis taille du fichier distant cohérente (`clasp pull` dans un dossier temporaire, ou vérification que `/dev` expose `typeof echarts === 'object'` dans la console).
- [ ] **Step 6 : commit** `package.json package-lock.json scripts/vendor.js src/Vendor.html src/Index.html tests/Vendor.test.js` — « Étape 4 : ECharts 6.1.0 embarqué ».

### Task 2 : règles de calcul (`Stats.html`)

**Files :**
- Create : `src/Stats.html`, `tests/Stats.test.js`
- Modify : `src/Index.html` (`<?!= include('Stats') ?>` après `Vendor`)

**Interfaces :**
- Consumes : objets ticket de `getTickets()` (`{ id, creeLe, titre, statut, assigne, categorie, majLe, … }`, dates ISO ou `null`).
- Produces (globaux navigateur) :
  - `echapper(texte) → string`
  - `ageJours(iso: string|null, maintenant: Date) → number|null`
  - `filtrer(tickets, { personne: string, categorie: string, periode: number|null }, maintenant) → Ticket[]` (`''` = tous ; `periode` en jours, `null` = Tout)
  - `kpis(tickets, ticketsSansPeriode, maintenant) → { ouverts, aValider, enCours, bloques, dormants, termines30 }` (`termines30` calculé sur `ticketsSansPeriode`)
  - `comparaison(tickets, maintenant) → { crees: {actuel, precedent}, termines: {actuel, precedent}, solde: {actuel, precedent} }`
  - `tendance(actuel, precedent) → 'hausse'|'baisse'|'egal'`
  - `aTraiter(tickets, maintenant, n = 5) → [{ id, titre, statut, age }]`
  - `parStatut(tickets, statuts: string[]) → [{ nom, n }]`
  - `regrouper(tickets, cle: 'assigne'|'categorie', connus: string[], libelleVide: string) → [{ nom, n }]` (connus dans l'ordre, puis `libelleVide` et `Hors référentiel` seulement si non vides)
  - `statutParPersonne(tickets, personnes, statuts) → { personnes: string[], series: [{ statut, valeurs: number[] }] }` (mêmes règles de regroupement, `Non assigné`)

- [ ] **Step 1 : banc de test** — extraire le contenu du `<script>` de `src/Stats.html` (regex) et l'exécuter dans un contexte `vm` ; `JSON.parse(JSON.stringify(...))` sur les résultats ; `MAINTENANT = new Date('2026-11-16T12:00:00Z')` ; helper `t({ statut, cree, maj, assigne, categorie, titre })` où `cree` / `maj` sont des **jours avant MAINTENANT** (`null` = pas de date) convertis en ISO.
- [ ] **Step 2 : tests qui échouent**
  - `kpis compte les statuts ouverts` : 2 À valider, 1 Validé, 1 En cours, 1 Bloqué, 1 Terminé, 1 Rejeté, 1 statut `Fini` → `ouverts 5, aValider 2, enCours 1, bloques 1`.
  - `dormant à partir de 15 jours pleins` : En cours `maj 14` → 0 ; `maj 15` → 1 ; `maj null, cree 20` → 1 ; aucune date → 0 ; Terminé `maj 40` → 0.
  - `terminés 30 j sur la liste sans période` : Terminé `maj 29` → compté ; `maj 30` → non ; le ticket n'est que dans `ticketsSansPeriode` → toujours compté.
  - `filtrer` : par assigné ; par catégorie ; `periode 7` garde `cree 6`, exclut `cree 8` et `cree null` ; `periode null` garde `cree null`.
  - `comparaison sur 30 j glissants` : créés `cree 1, 29` (actuel 2), `cree 30, 59` (précédent 2), `cree 60` (aucun) ; terminés idem sur `maj` ; `solde.actuel = termines.actuel − crees.actuel`.
  - `tendance` : (5,3) hausse, (3,5) baisse, (4,4) egal.
  - `aTraiter` : bloqués d'abord, puis plus anciens (`cree` décroissant en jours), `cree null` en dernier, clos exclus, 5 max ; `age` = jours depuis la création, `null` si pas de date.
  - `parStatut` : ordre de `statuts`, statut inconnu absent.
  - `regrouper par catégorie` : connus d'abord (y compris à 0), puis `Sans catégorie` (catégorie vide) et `Hors référentiel` (inconnue) seulement s'ils existent ; somme des `n` = nombre de tickets.
  - `statutParPersonne` : colonne `Non assigné` présente seulement si un ticket n'a pas d'assigné ; `Hors référentiel` idem ; somme de toutes les valeurs = nombre de tickets au statut connu.
  - `echapper` : `<img onerror="x">&'` → `&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;`.
- [ ] **Step 3 :** `npm test` → FAIL (fonctions absentes).
- [ ] **Step 4 :** implémenter `src/Stats.html` (un `<script>`, constantes `JOUR`, `STATUTS_OUVERTS`) jusqu'au vert.
- [ ] **Step 5 :** `npm test` → tous PASS.
- [ ] **Step 6 : commit** `src/Stats.html src/Index.html tests/Stats.test.js` — « Étape 4 : règles de calcul du Dashboard testées ».

### Task 3 : affichage du Dashboard

**Files :**
- Create : `src/Charts.html`
- Modify : `src/App.html`, `src/Styles.html`, `src/Index.html` (`<?!= include('Charts') ?>` après `Stats`)

**Interfaces :**
- Consumes : `echarts` (Task 1) ; fonctions de `Stats.html` (Task 2) ; `etat`, `afficher()`, `appelServeur` (étape 3).
- Produces : `optionsAnneau(parStatut)`, `optionsEmpilees(statutParPersonne)`, `optionsCategories(regroupement)` → objets d'options ECharts (dans `Charts.html`) ; couleur d'un statut lue dans les jetons `--st-*` via `getComputedStyle(document.documentElement)`.

- [ ] **Step 1 : `Charts.html`** — anneau `type: 'pie', radius: ['55%', '80%']` ; barres horizontales empilées (une série par statut, `stack: 'total'`) ; barres horizontales par catégorie en `--blue-500` ; police Inter avec repli ; animation sobre (`animationDuration: 300`).
- [ ] **Step 2 : `App.html`** — `etat.filtres = { personne: '', categorie: '', periode: null }` ; barre de filtres (2 `<select class="field">` remplis depuis `referentiels`, 4 `.chip` 7 j / 30 j / 90 j / Tout avec `aria-pressed`) ; à chaque changement : `filtrer` deux fois (avec et sans période), puis rendu dans `vue-dashboard`, dans l'ordre de la disposition B : filtres, 6 KPI (`.kpi`, Bloqués en rouge), carte comparaison (Créés neutre ; Terminés et Solde vert si hausse, rouge si baisse ; texte « ▲ +3 vs 2 »), puis [À traiter | anneau], puis [empilées | catégories]. Instances ECharts créées une fois (`echarts.init`), mises à jour par `setOption(…, true)`, `resize()` sur `window.resize`. Si 0 ticket filtré : message « Aucun ticket pour ces filtres » à la place des graphiques. Graphe et Tickets gardent leur texte d'attente.
- [ ] **Step 3 : `Styles.html`** — grille : 6 KPI sur une ligne au-delà de 900 px, 3 colonnes entre 600 et 900, 2 en dessous ; blocs en `grid-template-columns: 1.6fr 1fr` au-delà de 900 px, une colonne en dessous ; hauteur des graphiques 260 px ; couleur `#B23B35` pour Bloqués (contraste ≥ 4,5 sur `--card`) ; vert `#1B7F5B` et rouge `#B23B35` pour les tendances (≥ 4,5).
- [ ] **Step 4 : vérification** — `npm test` vert ; aperçu local (faux `google.script.run` renvoyant les 25 tickets du seed via `buildDemoRows_` + `ligneVersTicket_`) : valeurs démo Ouverts 18 / À valider 5 / En cours 6 / Bloqués 3 ; Review Focus 1 à 3 et 5 ; 375 px ; aucune requête vers un CDN de graphiques. Puis `clasp push` et vérification `/dev` par Valentin.
- [ ] **Step 5 : commit** `src/Charts.html src/App.html src/Styles.html src/Index.html` — « Étape 4 : affichage du Dashboard ».
