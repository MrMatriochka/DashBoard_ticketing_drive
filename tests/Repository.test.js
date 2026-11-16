// Tests locaux de Repository.js : on charge le code Apps Script dans un bac à sable Node (vm),
// puisque Apps Script n'a pas de modules et que tout y est global.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

const ctx = vm.createContext({});
for (const fichier of ['src/Setup.js', 'src/Repository.js']) {
  vm.runInContext(fs.readFileSync(fichier, 'utf8'), ctx, { filename: fichier });
}
// Dates fabriquées avec le Date du bac à sable, sinon `instanceof Date` échoue (autre « realm »).
const D = vm.runInContext('Date', ctx);
// Passage par JSON : c'est ce que reçoit le navigateur via google.script.run.
const convertir = (valeurs, ligne = 2) => JSON.parse(JSON.stringify(ctx.ligneVersTicket_(valeurs, ligne)));

/** Ligne valide de 11 valeurs ; `surcharges` = { indexColonne0: valeur }. */
const ligne = (surcharges = {}) => {
  const valeurs = [
    'TK-001', new D('2026-11-01T09:00:00Z'), 'Titre', '[DÉMO] desc', 'Support', 'Haute',
    'Léa Bonnet', 'Théo Rivière', 'En cours', new D('2026-11-02T14:00:00Z'), '',
  ];
  Object.entries(surcharges).forEach(([i, v]) => { valeurs[i] = v; });
  return valeurs;
};

test('ligne complète → objet avec dates ISO et aucune anomalie', () => {
  assert.deepStrictEqual(convertir(ligne(), 5), {
    ligne: 5, id: 'TK-001', creeLe: '2026-11-01T09:00:00.000Z', titre: 'Titre',
    description: '[DÉMO] desc', categorie: 'Support', priorite: 'Haute',
    demandeur: 'Léa Bonnet', assigne: 'Théo Rivière', statut: 'En cours',
    majLe: '2026-11-02T14:00:00.000Z', motif: '', anomalies: [],
  });
});

test('ligne vide → null', () => {
  assert.strictEqual(convertir(Array(11).fill('')), null);
});

test('ID vide ou espaces → id null + "ID manquant"', () => {
  for (const id of ['', '   ']) {
    const t = convertir(ligne({ 0: id }));
    assert.strictEqual(t.id, null);
    assert.deepStrictEqual(t.anomalies, ['ID manquant']);
  }
});

test('date texte ou nombre → null + "Date de création manquante ou invalide"', () => {
  for (const date of ['hier', 45000, '']) {
    const t = convertir(ligne({ 1: date }));
    assert.strictEqual(t.creeLe, null);
    assert.deepStrictEqual(t.anomalies, ['Date de création manquante ou invalide']);
  }
});

test('Mis à jour le vide → null sans anomalie', () => {
  const t = convertir(ligne({ 9: '' }));
  assert.strictEqual(t.majLe, null);
  assert.deepStrictEqual(t.anomalies, []);
});

test('statut hors liste → "Statut inconnu"', () => {
  assert.deepStrictEqual(convertir(ligne({ 8: 'Fini' })).anomalies, ['Statut inconnu']);
});

test('Bloqué sans motif → "Motif manquant"', () => {
  assert.deepStrictEqual(convertir(ligne({ 8: 'Bloqué' })).anomalies, ['Motif manquant']);
});

test('Bloqué avec motif → aucune anomalie', () => {
  assert.deepStrictEqual(convertir(ligne({ 8: 'Bloqué', 10: 'Attente RH' })).anomalies, []);
});

test('textes nettoyés', () => {
  assert.strictEqual(convertir(ligne({ 2: '  Titre  ' })).titre, 'Titre');
});

// --- getTickets : faux Sheet minimal (seules les méthodes utilisées par Repository.js) ---
const fauxSheet = (lignes) => ({
  getLastRow: () => lignes.length,
  getRange: (r, c, n, m) => {
    if (n < 1) throw new Error('Le nombre de lignes de la plage doit être au moins 1.'); // comme Apps Script
    return { getValues: () => lignes.slice(r - 1, r - 1 + n).map((l) => l.slice(c - 1, c - 1 + m)) };
  },
});
const avecClasseur = (tickets, refs) => {
  const feuilles = { Tickets: fauxSheet(tickets), 'Référentiels': fauxSheet(refs) };
  ctx.SpreadsheetApp = { getActive: () => ({ getSheetByName: (nom) => feuilles[nom] }) };
  return JSON.parse(JSON.stringify(ctx.getTickets()));
};
const ENTETE_REFS = ['Personnes', 'Catégories', 'Statuts', 'Priorités'];

test('getTickets : feuille Tickets avec en-tête seul → aucun ticket, pas de démo', () => {
  const r = avecClasseur([Array(11).fill('en-tête')], [ENTETE_REFS]);
  assert.deepStrictEqual(r.tickets, []);
  assert.strictEqual(r.demo, false);
});

test('getTickets : ligne vide ignorée, numéros de ligne justes, démo détectée', () => {
  const r = avecClasseur(
    [Array(11).fill('en-tête'), ligne(), Array(11).fill(''), ligne({ 0: 'TK-002', 3: 'vrai ticket' })],
    [ENTETE_REFS]
  );
  assert.deepStrictEqual(r.tickets.map((t) => t.ligne), [2, 4]);
  assert.strictEqual(r.demo, true);
});

test('getTickets : référentiels sans les cellules vides', () => {
  const r = avecClasseur([Array(11).fill('en-tête')], [
    ENTETE_REFS,
    ['Léa Bonnet', 'Données', 'À valider', 'Haute'],
    ['', 'Support', 'Validé', ''],
  ]);
  assert.deepStrictEqual(r.referentiels, {
    personnes: ['Léa Bonnet'], categories: ['Données', 'Support'],
    statuts: ['À valider', 'Validé'], priorites: ['Haute'],
  });
});
