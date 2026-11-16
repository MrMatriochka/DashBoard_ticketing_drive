# Chantier 2 — Vue Tickets (lecture seule)

**Intention.** Retrouver un ticket (recherche) et trier / passer en revue les tickets (triage), dans une liste qui accueillera ensuite la validation et la saisie (chantier 3). Clic sur un ticket = fiche latérale existante.

**Non-objectifs.** Création, changement de statut, suppression (chantier 3) ; export ; pagination (inutile à cette échelle).
**Anti-objectifs.** Un tableau illisible à 375 px ; un tri qui place les valeurs vides n'importe où ; du texte du Sheet non échappé.

## Approches
- **Tableau triable, transformé en cartes sous 600 px par le CSS seul** — retenue (présentation A choisie par Valentin) ; un seul balisage, tri par en-têtes.
- Liste de cartes partout (B) — écartée par Valentin : moins dense pour chercher et comparer.
- Sections par statut (C) — écartée : tri libre peu naturel ; la puce « À valider » couvre le triage.
- *(choix de Claude)* deux balisages (tableau + cartes) — écarté : double code à maintenir pour le même contenu.

## Ce qui est construit
- **Filtres partagés** (personne assignée, catégorie, période) : désormais visibles aussi sur la vue Tickets.
- **Recherche instantanée** sur ID, titre, description ; insensible à la casse et aux accents.
- **Puces** (choix unique, avec compteur calculé après filtres et recherche) : *Ouverts* (défaut : À valider, Validé, En cours, Bloqué), *À valider*, *Bloqués*, *Tous*, *⚠ À corriger* (ticket avec au moins une anomalie ; puce affichée seulement si son compteur > 0, ou si elle est active).
- **Tableau** : ID · Titre (+ marque « ⚠ » et texte des anomalies) · Statut (pastille) · Priorité (« Haute » en rouge) · Catégorie · Assigné à · Âge (jours depuis la création) · Mis à jour (« il y a N j »).
- **Tri** par clic sur l'en-tête (bouton dans le `<th>`, `aria-sort`) ; second clic = sens inverse. Défaut : priorité (Haute d'abord) puis ancienneté. Ordres *(choix de Claude)* : priorité Haute → Basse ; statut dans l'ordre du référentiel ; ID par ordre naturel (`TK-2` avant `TK-10`) ; âge et mise à jour du plus ancien au plus récent en sens croissant. **Valeurs vides toujours en dernier**, quel que soit le sens.
- **Ouverture de la fiche** : clic sur la ligne, ou Entrée sur le bouton du titre ; Échap rend le focus à ce bouton.
- **Sous 600 px** : chaque ligne devient une carte (ID + priorité, titre, statut · assigné · âge) ; en-têtes masqués, tri par une liste déroulante.
- **Compteur** « 12 tickets sur 25 » ; **vide** : « Aucun ticket ne correspond ».

## Fichiers
- `src/Stats.html` : fonctions pures `normaliser(texte)`, `rechercher(tickets, texte)`, `garderPuce(tickets, puce)`, `compterPuces(tickets)`, `trier(tickets, { cle, sens }, statuts)` — testées dans `tests/Stats.test.js`.
- `src/Tickets.html` (nouveau) : barre (recherche, puces, tri mobile), tableau, événements.
- `src/App.html` : `etat.tickets = { recherche: '', puce: 'ouverts', tri: { cle: 'priorite', sens: 'asc' } }` ; la barre de filtres n'est plus masquée sur cette vue.
- `src/Styles.html`, `src/Index.html`.

## Vérification
`npm test` ; aperçu local (vrais clics, clavier, 375 px, titre piégé, ligne avec anomalie) ; `/dev` par Valentin.

## Laissé au constructeur
Largeurs de colonnes, libellés exacts des en-têtes, délai éventuel de la recherche.
