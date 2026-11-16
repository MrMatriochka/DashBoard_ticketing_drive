# Étape 2 — Repository.js, getTickets(), doGet() de test

## Intention
Le navigateur reçoit **en un seul appel** tout ce qu'il faut pour les trois vues, sans jamais planter sur une ligne collée à la main dans le Sheet.

## Objectifs / non-objectifs
- **Objectifs** : lire Tickets et Référentiels ; objets sérialisables (dates ISO) ; signaler les lignes incomplètes sans les rejeter ; tester la conversion en local.
- **Non-objectifs** : écriture (étape 6), filtres et agrégats (côté navigateur), page HTML (étape 3).
- **Anti-objectif** : une ligne mal saisie qui fait échouer tout le chargement.

## Approches
1. **Fonction pure `ligneVersTicket_` séparée de l'accès Sheet, testée avec `node --test`** — retenue (choix de Valentin) : cas limites vérifiés automatiquement, logique métier isolée de l'accès aux données.
2. Tout dans `getTickets()`, test manuel via `/dev` — écartée : cas limites jamais vraiment testés.
3. Colonnes repérées par nom d'en-tête — écartée : `COL` existe, flexibilité non demandée (YAGNI).

## Contrat de `getTickets()` (choix B de Valentin)
```js
{
  tickets: [{
    ligne: 2,              // numéro de ligne Sheet : repère même sans ID
    id: 'TK-001' | null,
    creeLe: '2026-09-19T07:00:00.000Z' | null,
    titre, description, categorie, priorite, demandeur, assigne, statut, motif, // chaînes ('' si vide)
    majLe: ISO | null,
    anomalies: ['ID manquant', …]
  }],
  referentiels: { personnes: [], categories: [], statuts: [], priorites: [] },
  demo: true             // au moins une description commence par [DÉMO]
}
```

## Règles de conversion (`ligneVersTicket_(valeurs, ligne)`)
- Ligne entièrement vide → `null` (ignorée par `getTickets`).
- Cellule date : `Date` valide → ISO ; vide → `null` ; texte ou date invalide → `null`.
- Anomalies signalées (même périmètre que les surlignages rouges du Sheet, plus le statut dont dépendent le graphe et les KPI) :
  - `ID manquant`
  - `Date de création manquante ou invalide`
  - `Statut inconnu` (absent de `STATUTS`, possible après un collage qui contourne la validation)
  - `Motif manquant` (statut Bloqué / Rejeté sans motif)
- Textes : `String(v).trim()`.

## Fichiers
- `src/Repository.js` : `ligneVersTicket_`, `lireReferentiels_`, `getTickets`.
- `src/Code.js` : `doGet()` **temporaire** qui renvoie le JSON (`ContentService`, mime JSON) ; remplacé par la page HtmlService à l'étape 3.
- `tests/Repository.test.js` : charge `src/Setup.js` + `src/Repository.js` dans un contexte `vm` (pas de modules en Apps Script) et teste `ligneVersTicket_`. Hors `src/`, donc jamais poussé par clasp.
- `package.json` : script `"test": "node --test"`.

## Vérification
- `npm test` vert.
- `clasp push`, puis déploiement de test `/dev` (Déployer → Tester les déploiements) : JSON avec 25 tickets, `demo: true`, aucune anomalie ; puis vider un ID dans le Sheet → l'anomalie apparaît.

## Laissé au constructeur
Noms des fonctions internes, messages exacts des anomalies, ordre des tests.
Non couverts volontairement : catégorie / personne hors référentiel (validation serveur de l'étape 6).
