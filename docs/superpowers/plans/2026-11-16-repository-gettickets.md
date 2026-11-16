# Repository et getTickets — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** `getTickets()` renvoie `{ tickets, referentiels, demo }` lu depuis le Sheet, en tolérant les lignes saisies à la main, et `doGet()` l'affiche en JSON pour test `/dev`.

**Architecture :** une fonction pure `ligneVersTicket_` (tableau de valeurs → objet + anomalies) testée en local avec Node ; `getTickets` ne fait que lire le Sheet (un `getValues()` par feuille) et assembler.

**Tech Stack :** Apps Script V8 (fonctions globales, pas de modules), `node:test` + `node:vm` pour les tests locaux, clasp.

**Spec :** `docs/superpowers/specs/2026-11-16-repository-gettickets-design.md`

## Global Constraints
- Pas d'`import` / `export` dans `src/` : tout est global ; réutiliser `COL`, `STATUTS`, `STATUTS_AVEC_MOTIF`, `REF_COL`, `DEMO_PREFIX`, `SHEET_TICKETS`, `SHEET_REFS`, `getSheetOrThrow_` de `src/Setup.js`.
- Tests dans `tests/` (hors `rootDir`, jamais poussés par clasp).
- Valeurs renvoyées sérialisables : dates en chaîne ISO (`toISOString()`) ou `null`.
- Messages d'anomalie exacts : `ID manquant`, `Date de création manquante ou invalide`, `Statut inconnu`, `Motif manquant`.

## Review Focus
1. ID composé d'espaces seulement → traité comme manquant (test ajouté en Task 1).
2. Cellule date contenant un nombre ou du texte (collage) → `null` + anomalie, pas d'exception (test ajouté en Task 1).
3. Ligne vide au milieu des données → ignorée, les numéros `ligne` des suivantes restent justes (vérifié en Task 2 au test `/dev`).
4. Feuille Tickets avec seulement l'en-tête → `tickets: []`, pas d'erreur `getRange` à 0 ligne (Task 2).
5. Colonne de référentiel avec trous → valeurs vides filtrées (Task 2).

---

### Task 1 : `ligneVersTicket_` et le banc de test Node

**Files :**
- Create : `src/Repository.js`
- Create : `tests/Repository.test.js`
- Modify : `package.json` (script `"test": "node --test"`)

**Interfaces :**
- Consumes : constantes de `src/Setup.js` (voir Global Constraints).
- Produces : `ligneVersTicket_(valeurs: any[11], ligne: number) → Ticket | null`, avec
  `Ticket = { ligne, id: string|null, creeLe: string|null, titre, description, categorie, priorite, demandeur, assigne, statut, majLe: string|null, motif, anomalies: string[] }`.

- [ ] **Step 1 : banc de test.** En tête de `tests/Repository.test.js` : créer un contexte `vm`, y exécuter `src/Setup.js` puis `src/Repository.js`. Deux pièges inter-« realms » à contourner :
  - fabriquer les dates avec le `Date` du contexte : `const D = vm.runInContext('Date', ctx)` ;
  - comparer le résultat après `JSON.parse(JSON.stringify(...))` (c'est d'ailleurs exactement ce que reçoit le navigateur via `google.script.run`).
  Helper : `const ligne = (champs) => [...]` qui produit une ligne valide de 11 valeurs (`TK-001`, `new D('2026-11-01T09:00:00Z')`, `Titre`, `[DÉMO] desc`, `Support`, `Haute`, `Léa Bonnet`, `Théo Rivière`, `En cours`, `new D('2026-11-02T14:00:00Z')`, `''`) et applique les surcharges `{ index: valeur }`.

- [ ] **Step 2 : tests qui échouent** (`node:test`, `assert.deepStrictEqual` / `strictEqual`) :
  - `ligne complète → objet avec dates ISO et aucune anomalie` : `creeLe === '2026-11-01T09:00:00.000Z'`, `majLe === '2026-11-02T14:00:00.000Z'`, `ligne === 5` (pour `ligne` passé à 5), `anomalies` `[]`.
  - `ligne vide → null` : 11 × `''`.
  - `ID vide ou espaces → id null + "ID manquant"` : avec `''` puis `'   '`.
  - `date texte ou nombre → null + "Date de création manquante ou invalide"` : avec `'hier'` puis `45000`.
  - `Mis à jour le vide → null sans anomalie`.
  - `statut hors liste → "Statut inconnu"` : `'Fini'`.
  - `Bloqué sans motif → "Motif manquant"` ; `Bloqué avec motif → aucune anomalie`.
  - `textes nettoyés` : titre `'  Titre  '` → `'Titre'`.

- [ ] **Step 3 :** `npm test` → FAIL (`ligneVersTicket_` n'existe pas).

- [ ] **Step 4 : implémenter `ligneVersTicket_(valeurs, ligne)` dans `src/Repository.js`.** Ligne vide = toutes les valeurs `''` après trim. Date valide = `v instanceof Date && !isNaN(v)`. Les anomalies s'ajoutent dans l'ordre des messages des Global Constraints.

- [ ] **Step 5 :** `npm test` → tous les tests PASS.

- [ ] **Step 6 : commit** `src/Repository.js tests/Repository.test.js package.json` — « Étape 2 : conversion ligne → ticket testée en local ».

### Task 2 : `getTickets`, référentiels, `doGet` de test

**Files :**
- Modify : `src/Repository.js`
- Create : `src/Code.js`

**Interfaces :**
- Consumes : `ligneVersTicket_` (Task 1), `getSheetOrThrow_(nom)` (Setup.js).
- Produces : `getTickets() → { tickets: Ticket[], referentiels: { personnes, categories, statuts, priorites: string[] }, demo: boolean }` ; `doGet()` (temporaire, remplacé à l'étape 3).

- [ ] **Step 1 : `lireReferentiels_()`** dans `src/Repository.js` : un seul `getValues()` sur la feuille `SHEET_REFS` (lignes 2 → dernière), une liste par colonne `REF_COL`, valeurs vides retirées.

- [ ] **Step 2 : `getTickets()`** : si `getLastRow() < 2` → `tickets: []` (sinon `getRange` à 0 ligne lève une erreur) ; sinon un `getValues()` sur toutes les colonnes, `ligne = index + 2`, `ligneVersTicket_` puis retrait des `null`. `demo = tickets.some(t => t.description.startsWith(DEMO_PREFIX))`.

- [ ] **Step 3 : `doGet()`** dans `src/Code.js` : `ContentService.createTextOutput(JSON.stringify(getTickets(), null, 2)).setMimeType(ContentService.MimeType.JSON)`, avec un commentaire « temporaire : remplacé par HtmlService à l'étape 3 ».

- [ ] **Step 4 :** `npm test` toujours vert, puis `clasp push`.

- [ ] **Step 5 : vérification `/dev`** (Valentin) : éditeur Apps Script → Déployer → Tester les déploiements → ouvrir l'URL `/dev`. Attendu : 25 tickets, `demo: true`, toutes les `anomalies` vides, 4 listes de référentiels remplies. Puis dans le Sheet : vider l'ID de TK-003 et insérer une ligne vide au-dessus de TK-010 → recharger : `"ID manquant"` sur la bonne `ligne`, la ligne vide absente, les `ligne` suivantes décalées de 1. Annuler ces modifications ensuite.

- [ ] **Step 6 : commit** `src/Repository.js src/Code.js` — « Étape 2 : getTickets et doGet de test ».
