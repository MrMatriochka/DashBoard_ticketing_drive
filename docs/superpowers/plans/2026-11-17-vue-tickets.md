# Vue Tickets — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** la vue Tickets affiche un tableau triable et cherchable des tickets (cartes sous 600 px), avec puces de statut et « À corriger », et ouvre la fiche latérale au clic.

**Architecture :** fonctions pures dans `Stats.html` (testées) ; rendu et événements dans `Tickets.html` ; état dans `App.html`.

**Tech Stack :** HtmlService, JS vanilla, `node:test`.

**Spec :** `docs/superpowers/specs/2026-11-17-vue-tickets-design.md`

## Global Constraints
- Texte du Sheet via `echapper()` ; aucune dépendance ajoutée.
- Puces : `ouverts` (défaut), `a-valider`, `bloques`, `tous`, `a-corriger` (au moins une anomalie).
- Tri : `cle` ∈ `id`, `titre`, `statut`, `priorite`, `categorie`, `assigne`, `age`, `maj` ; `sens` ∈ `asc`, `desc` ; vides toujours en dernier.
- 375 px sans défilement horizontal de la page ; contraste AA.

## Review Focus
1. Ticket sans ID, sans date ou sans priorité → trié en dernier dans les deux sens (test Task 1).
2. Recherche avec accents / majuscules (« BLOQUE », « réinitialiser ») → trouve (test Task 1).
3. Recherche + puce + filtres combinés qui ne laissent rien → « Aucun ticket ne correspond », compteurs à jour (Task 2).
4. Titre piégé `<img onerror>` → texte dans la ligne (Task 2).
5. Clavier : Tab jusqu'au titre, Entrée ouvre la fiche, Échap rend le focus ; tri au clavier sur les en-têtes (Task 2).

---

### Task 1 : recherche, puces, tri (Stats.html)

**Files :** Modify `src/Stats.html`, `tests/Stats.test.js`

**Interfaces — Produces :**
- `normaliser(texte) → string` (minuscules, sans accents : `normalize('NFD')` puis retrait des diacritiques)
- `rechercher(tickets, texte) → Ticket[]` (texte vide = tous ; cherche dans `id`, `titre`, `description`)
- `garderPuce(tickets, puce) → Ticket[]`
- `compterPuces(tickets) → { ouverts, 'a-valider', bloques, tous, 'a-corriger' }`
- `trier(tickets, { cle, sens }, statuts: string[]) → Ticket[]` (nouvelle liste ; tri stable)

- [ ] **Step 1 : tests qui échouent**
  - `rechercher ignore casse et accents` : titres « Réinitialiser l'accès », « Imprimante » ; `'REINITIALISER'` → 1 ; `'tk-00'` trouve par ID ; `''` → tous ; cherche aussi dans la description.
  - `garderPuce et compterPuces` : liste de `TOUS` (étape 4) + un ticket avec `anomalies: ['ID manquant']` → compteurs `ouverts 5`, `'a-valider' 2`, `bloques 1`, `tous 9`, `'a-corriger' 1` ; `garderPuce(…, 'a-corriger')` → le seul ticket en anomalie. Les tickets du helper reçoivent `anomalies: []` par défaut.
  - `trier par priorité : Haute d'abord, vides en dernier dans les deux sens` : Basse, Haute, (vide), Moyenne → asc `Haute, Moyenne, Basse, vide` ; desc `Basse, Moyenne, Haute, vide`.
  - `trier par ID en ordre naturel` : `TK-10`, `TK-2`, `null` → asc `TK-2, TK-10, null`.
  - `trier par statut selon le référentiel` : En cours, À valider, Bloqué → `À valider, En cours, Bloqué`.
  - `trier par âge et mise à jour` : `age` asc = du plus ancien (`creeLe` le plus petit) au plus récent, sans date en dernier ; idem `maj` sur `majLe`.
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 :** implémenter (comparateur unique : valeurs vides détectées avant d'appliquer le sens ; `localeCompare(…, 'fr', { numeric: true })` pour ID et textes).
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : commit** — « Chantier 2 : recherche, puces et tri des tickets testés ».

### Task 2 : vue Tickets (Tickets.html)

**Files :** Create `src/Tickets.html` ; Modify `src/App.html`, `src/Index.html`, `src/Styles.html`

**Interfaces :** Consumes Task 1, `filtrer`, `ageJours`, `echapper`, `couleurStatut`, `ouvrirFiche` ; Produces `construireTickets()` (appelée par `construire()`) et `afficherTickets()` (appelée par `afficher()` quand `etat.vue === 'tickets'`).

- [ ] **Step 1 :** `App.html` — `etat.tickets = { recherche: '', puce: 'ouverts', tri: { cle: 'priorite', sens: 'asc' } }` ; supprimer le texte d'attente de la vue Tickets ; ne plus masquer `#filtres` sur cette vue.
- [ ] **Step 2 :** `Tickets.html` — barre : `<input type="search" class="field">` (événement `input`), puces `.chip` avec `aria-pressed` et compteur, liste déroulante de tri visible seulement sous 600 px ; compteur « N tickets sur T » ; tableau (`<th>` contenant un `<button>` de tri, `aria-sort` sur la colonne triée) ; chaque ligne : titre dans un `<button class="lien-ticket" data-ligne>` ; clic sur la ligne ou le bouton → `ouvrirFiche(ticket, bouton)` ; anomalies affichées « ⚠ » + texte sous le titre ; message vide.
- [ ] **Step 3 :** `Styles.html` — tableau aéré (lignes en cartes légères, bordure gauche couleur du statut) ; sous 600 px : `thead` masqué, `tr` en grille (ID + priorité / titre / statut · assigné · âge), autres cellules masquées.
- [ ] **Step 4 : vérification** — `npm test` ; aperçu local : Review Focus 2 à 5 avec vrais clics et clavier, une ligne avec anomalie injectée, 375 px ; puis `clasp push` et `/dev` par Valentin.
- [ ] **Step 5 : commit** — « Chantier 2 : vue Tickets ».
