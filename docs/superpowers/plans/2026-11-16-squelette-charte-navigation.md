# Squelette, charte et navigation — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** `doGet` sert la page Hub tickets (en-tête marine, bandeau démo, navigation néomorphique, 3 vues vides) qui charge `getTickets()` une fois et gère chargement / erreur / prêt.

**Architecture :** HtmlService assemble `Index.html` + `Styles.html` + `App.html` via `include()`. `App.html` : JavaScript vanilla, un état `{ vue, donnees }` et une fonction `afficher()` ; les vues sont basculées par l'attribut `hidden`.

**Tech Stack :** Apps Script HtmlService, HTML/CSS/JS vanilla, Google Fonts (Inter, avec repli).

**Spec :** `docs/superpowers/specs/2026-11-16-squelette-charte-navigation-design.md`

## Global Constraints
- Aucune bibliothèque front ; seule ressource externe : Google Fonts, avec repli `font-family: Inter, system-ui, sans-serif`.
- `doGet()` = `HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Hub tickets').addMetaTag('viewport', 'width=device-width, initial-scale=1')`.
- Jetons `:root` copiés du CLAUDE.md, plus `--raised: 5px 5px 12px var(--shadow-dark), -5px -5px 12px var(--shadow-light)` et `--inset: inset 3px 3px 7px var(--shadow-dark), inset -3px -3px 7px var(--shadow-light)`.
- Relief = cliquable ; creusé = saisi / sélectionné / bandeau ; bordure `#CBD4E1` sur champs et boutons ; liseré `--blue-500` sur l'actif et `:focus-visible`.
- Utilisable à 375 px sans défilement horizontal ; contraste texte AA.
- Texte dynamique inséré avec `textContent` (jamais `innerHTML` avec des données).

## Review Focus
1. Serveur en erreur (feuille Tickets renommée) → message lisible + bouton « Réessayer » qui relance l'appel, pas de page blanche (vérifié en Task 2, step 4).
2. Largeur 375 px → aucun défilement horizontal, rail de navigation lisible (Task 2, step 4).
3. Navigation au clavier → Tab atteint les 3 boutons, focus visible, Entrée change de vue (Task 2, step 4).
4. Google Fonts bloqué → la page reste propre en police système (Task 2, step 4 : bloquer `fonts.googleapis.com` dans l'onglet Réseau des outils développeur).
5. Jeu sans démo (`demo: false`) → bandeau absent (Task 2, step 4 : forcer `donnees.demo = false` dans la console puis `afficher()`).

---

### Task 1 : coquille HTML/CSS servie par `doGet`

**Files :**
- Modify : `src/Code.js` (remplacer le `doGet` JSON)
- Create : `src/Index.html`, `src/Styles.html`, `src/App.html` (vide pour l'instant : `<script></script>`)

**Interfaces :**
- Produces : `include(nom: string) → string` (global, `Code.js`) ; dans `Index.html`, les éléments d'id `compteur`, `bandeau-demo`, `etat`, `vue-dashboard`, `vue-graphe`, `vue-tickets`, et les boutons de navigation `<button data-vue="dashboard|graphe|tickets">` dans `<nav class="nav">`.

- [ ] **Step 1 :** `Code.js` : `doGet()` selon les Global Constraints ; `include(nom)` → `HtmlService.createHtmlOutputFromFile(nom).getContent()`. Commentaire d'une ligne sur `include` (assemble les fichiers HTML, le motif `<?!= include('Styles') ?>`).
- [ ] **Step 2 :** `Index.html` : `<head>` avec Google Fonts Inter 400/500/600 (`display=swap`) et `<?!= include('Styles') ?>` ; `<body>` : `<header>` (titre « Hub tickets » + `<span id="compteur">`), `<div id="bandeau-demo" class="demo" hidden>Données de démonstration — jeu de test</div>`, `<nav class="nav" aria-label="Vues">` à 3 boutons, `<p id="etat" role="status">`, 3 `<section id="vue-…" hidden>` ; `<?!= include('App') ?>` en fin de `body`.
- [ ] **Step 3 :** `Styles.html` : jetons + `--raised` / `--inset` ; `body` sur `--surface`, Inter avec repli, `font-variant-numeric: tabular-nums` sur `.kpi` ; classes `.card`, `.btn`, `.btn-primary`, `.field`, `.chip` (+ `.chip[aria-pressed="true"]`), `.nav` (rail creusé ; bouton `[aria-current="page"]` en relief + liseré), `.badge`, `.demo`, `[hidden]{display:none !important}` ; `:focus-visible` liseré bleu ; contenu centré `max-width: 1100px`, gouttières 16 px.
- [ ] **Step 4 :** `npm test` (12 tests toujours verts) puis `clasp push`. Ouvrir `/dev` → Expected : en-tête marine, rail de navigation, aucune erreur dans la console du navigateur (les vues sont encore toutes cachées : normal).
- [ ] **Step 5 : commit** `src/Code.js src/Index.html src/Styles.html src/App.html` — « Étape 3 : coquille HTML et charte ».

### Task 2 : comportement (`App.html`)

**Files :**
- Modify : `src/App.html`

**Interfaces :**
- Consumes : ids et `data-vue` de la Task 1 ; `getTickets() → { tickets, referentiels, demo }` (étape 2).
- Produces (pour les étapes 4–6) : `appelServeur(nomFonction: string, ...args) → Promise` ; `etat = { vue: 'dashboard'|'graphe'|'tickets', donnees: null | {tickets, referentiels, demo} }` ; `afficher()`.

- [ ] **Step 1 :** `appelServeur` : `new Promise` autour de `google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[nomFonction](...args)`.
- [ ] **Step 2 :** `charger()` : `#etat` = « Chargement des tickets… » → `appelServeur('getTickets')` → `etat.donnees` puis `afficher()` ; en cas d'échec : `#etat` = « Impossible de charger les tickets : » + `err.message`, et un bouton `.btn` « Réessayer » qui rappelle `charger()`. Lancé au chargement de la page.
- [ ] **Step 3 :** `afficher()` : compteur « N tickets » ; `bandeau-demo.hidden = !donnees.demo` ; seule la section de `etat.vue` visible ; `aria-current="page"` sur le bouton actif ; texte d'attente dans chaque section (« Dashboard — étape 4 · 25 tickets chargés », idem Graphe étape 5, Tickets étape 6) dans une `.card`. Clic sur un bouton `[data-vue]` → `etat.vue = …` puis `afficher()`.
- [ ] **Step 4 : vérification `/dev`** après `clasp push` (Valentin, avec la liste du Review Focus 1 à 5) — Expected : compteur 25, bandeau visible, les 3 vues s'affichent, chaque point du Review Focus se comporte comme décrit.
- [ ] **Step 5 :** mesurer le contraste de `--text-muted` et `--text` sur `--surface` / `--card` (≥ 4,5:1) ; ajuster le jeton si besoin.
- [ ] **Step 6 : commit** `src/App.html` (et `Styles.html` si ajusté) — « Étape 3 : chargement des données et navigation ».

**Note :** `echapper()` (prévue dans la spec) n'est pas écrite à cette étape : aucun texte du Sheet n'est encore inséré en HTML, et `textContent` suffit. Elle arrive avec le premier affichage de titres (étape 4).
