# Vue Graphe — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** la vue Graphe affiche l'arbre Hub → branches → cartes sur deux côtés, avec regroupement, interrupteur des clos, filtres partagés, zoom / vue d'ensemble et fiche latérale en lecture seule.

**Architecture :** calculs purs dans `Stats.html` (`brancher`, `repartir`, testés en Node) ; `Graphe.html` construit le DOM de l'arbre, les liens SVG et le zoom ; `Fiche.html` gère le panneau ; `App.html` partage la barre de filtres entre Dashboard et Graphe.

**Tech Stack :** HtmlService, HTML/CSS/JS vanilla, `node:test`.

**Spec :** `docs/superpowers/specs/2026-11-17-vue-graphe-design.md` — référence visuelle : `docs/superpowers/maquettes/2026-11-17-graphe-v3.html` (le code du prototype peut être repris, en l'adaptant aux conventions du projet).

## Global Constraints
- Aucune dépendance ajoutée ; ECharts n'est **pas** utilisé dans cette vue.
- Tout texte du Sheet inséré en HTML passe par `echapper()`.
- Zoom 40 % – 160 % ; vue d'ensemble sous 60 % ; glissement à partir de 5 px ; « Ajuster » ne dépasse pas 100 %.
- Libellés : `Non assigné`, `Sans catégorie`, `Sans statut`, `Hors référentiel` ; « Afficher les clos » masque seulement `Terminé` et `Rejeté`.
- 375 px sans défilement horizontal de la page (l'arbre défile dans son cadre) ; contraste AA du texte.

## Review Focus
1. Clic court sur une carte après un petit mouvement involontaire (< 5 px) → la fiche s'ouvre (Task 3, vérification par vrai clic).
2. Changement de regroupement ou de filtre pendant qu'une fiche est ouverte → la fiche reste cohérente (elle montre le ticket cliqué) et l'arbre est réajusté (Task 3).
3. Branche avec un seul ticket / filtres qui ne laissent rien → pas d'erreur, message « Aucun ticket pour ces filtres » (Task 3).
4. Titre contenant du HTML → affiché en texte dans la carte et dans la fiche (Task 3, titre piégé dans l'aperçu).
5. Fiche au clavier : Tab jusqu'à une carte, Entrée ouvre, Échap ferme et rend le focus à la carte (Task 2 et 3).

---

### Task 1 : `brancher` et `repartir` (Stats.html)

**Files :** Modify `src/Stats.html`, `tests/Stats.test.js`

**Interfaces :**
- Consumes : `groupe`, `colonnes`, `ageJours` (déjà dans `Stats.html`).
- Produces :
  - `brancher(tickets, cle: 'statut'|'categorie'|'assigne', connus: string[], libelleVide: string, maintenant: Date) → [{ nom, n, hautes, bloques, tickets }]` — branches dans l'ordre de `colonnes(...)`, **seulement celles avec n > 0** ; `tickets` triés priorité (Haute, Moyenne, Basse, autre) puis du plus ancien au plus récent (`creeLe` absent en dernier).
  - `repartir(branches) → { gauche, droite }` — tri par `n` décroissant (stable), chaque branche du côté au total le plus faible, égalité → droite.

- [ ] **Step 1 : tests qui échouent** (`tests/Stats.test.js`, même harnais) :
  - `brancher par statut : ordre du référentiel, branches vides omises, inconnu en Hors référentiel` : tickets En cours ×2 (dont 1 Haute), Bloqué ×1, `Fini` ×1 ; `connus = STATUTS` → noms `['En cours', 'Bloqué', 'Hors référentiel']`, `n` `[2, 1, 1]`, En cours `hautes 1`, Bloqué `bloques 1`.
  - `brancher trie les cartes par priorité puis ancienneté` : Basse cree 50, Haute cree 2, Haute cree 10, Moyenne cree 5, Haute sans date → titres dans l'ordre Haute 10, Haute 2, Haute sans date, Moyenne 5, Basse 50.
  - `brancher par personne : assigné vide en Non assigné`.
  - `repartir équilibre les côtés` : n `[5, 4, 3, 1]` → droite `[5, 1]`, gauche `[4, 3]` ; `[2, 2]` → droite `[2]`, gauche `[2]` ; `[]` → deux listes vides.
- [ ] **Step 2 :** `npm test` → FAIL (fonctions absentes).
- [ ] **Step 3 :** implémenter les deux fonctions dans `src/Stats.html`.
- [ ] **Step 4 :** `npm test` → tout PASS.
- [ ] **Step 5 : commit** — « Étape 5 : regroupement et répartition de l'arbre testés ».

### Task 2 : fiche latérale et barre de filtres partagée

**Files :** Create `src/Fiche.html` ; Modify `src/App.html`, `src/Index.html`, `src/Styles.html`

**Interfaces :**
- Produces : `ouvrirFiche(ticket, origine: HTMLElement)`, `fermerFiche()` (globaux) ; dans `Index.html`, `<aside id="fiche" class="fiche" aria-labelledby="fiche-titre" hidden>` hors de `<main>` ; la barre de filtres est un élément `#filtres` placé avant les sections, visible pour les vues `dashboard` et `graphe`, caché pour `tickets`.

- [ ] **Step 1 : `Fiche.html`** — contenu : ID (titre `#fiche-titre`), titre complet, puis `dl` : statut (pastille), priorité, catégorie, demandeur, assigné à, créé le, mis à jour le (`toLocaleDateString('fr-FR')`, « — » si absent), motif s'il existe ; description. Textes via `echapper`. Ouverture : `hidden = false`, classe `ouverte`, focus sur le bouton Fermer ; fermeture (bouton × ou Échap) : retour du focus à `origine`.
- [ ] **Step 2 : `App.html`** — déplacer la construction de la barre de filtres hors de `vue-dashboard` vers `#filtres` (mêmes ids `f-personne`, `f-categorie`, `f-periode`, mêmes écouteurs) ; `afficher()` cache `#filtres` sur la vue `tickets`.
- [ ] **Step 3 : `Styles.html`** — panneau fixe à droite, 360 px, pleine largeur sous 600 px, au-dessus du contenu (`z-index`), translation à l'ouverture.
- [ ] **Step 4 :** `npm test` vert ; aperçu local : Dashboard inchangé avec la barre déplacée (filtres toujours actifs) ; `ouvrirFiche(etat.donnees.tickets[0], document.body)` depuis la console → panneau lisible, Échap ferme.
- [ ] **Step 5 : commit** — « Étape 5 : fiche latérale et filtres partagés ».

### Task 3 : arbre, zoom et vue d'ensemble (Graphe.html)

**Files :** Create `src/Graphe.html` ; Modify `src/App.html`, `src/Index.html`, `src/Styles.html`

**Interfaces :**
- Consumes : `brancher`, `repartir`, `filtrer`, `echapper`, `ageJours` (Stats) ; `ouvrirFiche` (Task 2) ; `couleurStatut` (Charts) ; `etat` (App).
- Produces : `afficherGraphe()` appelée par `afficher()` quand `etat.vue === 'graphe'` ; `etat.graphe = { grouper: 'statut', clos: false }`.

- [ ] **Step 1 : structure** — dans `vue-graphe` : contrôles (« Grouper par » en `.seg` à 3 boutons `aria-pressed`, case « Afficher les clos », boutons − / + / Ajuster), cadre `#vue-arbre` (hauteur 620 px, 70vh sous 600 px) contenant `#toile` (SVG des liens en `z-index: 0`, `.arbre` en `z-index: 1`), indicateur de niveau, légende, message « Aucun ticket pour ces filtres ».
- [ ] **Step 2 : rendu** — `filtrer` (filtres partagés) puis retrait de Terminé / Rejeté si `!clos` ; `brancher` avec `connus` = référentiel du regroupement et `libelleVide` (`Sans statut` / `Sans catégorie` / `Non assigné`) ; `repartir` ; HTML selon la géométrie de la spec (branche = `<button class="branche">`, carte = `<button class="carte" data-id>`) ; couleurs selon la spec, palette catégories 6 teintes cyclique ; liens SVG calculés à partir de `offsetLeft/offsetTop` (coordonnées non zoomées), deux chemins : branches (toujours) et cartes (classe masquée en vue d'ensemble) ; puis « Ajuster ».
- [ ] **Step 3 : zoom / déplacement** — molette centrée sur le pointeur, pincement, boutons, glissement après 5 px (capture du pointeur seulement à ce moment) ; classe `ensemble` sous 60 % (cartes et liens de cartes `visibility: hidden`, Hub et branches agrandis de `min(1.6, 0.6 / zoom)` vers l'extérieur) ; clic sur une branche en vue d'ensemble → zoom 100 % centré dessus ; clic / Entrée sur une carte (hors glissement) → `ouvrirFiche(ticket, carte)`.
- [ ] **Step 4 : vérification** — `npm test` vert ; aperçu local sur le seed (titre piégé injecté) : Review Focus 1 à 5 avec de **vrais clics** ; 375 px ; aucune erreur console. Puis `clasp push` et `/dev` par Valentin.
- [ ] **Step 5 : commit** — « Étape 5 : vue Graphe ».
