// Tests des règles de calcul du Dashboard (src/Stats.html).
// Le <script> du fichier HTML est extrait et exécuté dans un bac à sable Node : aucune dépendance au DOM.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('src/Stats.html', 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const ctx = vm.createContext({});
vm.runInContext(source, ctx, { filename: 'src/Stats.html' });
const json = (v) => JSON.parse(JSON.stringify(v)); // évite les pièges inter-« realms » sur les tableaux

const JOUR = 86400000;
const M = new Date('2026-11-16T12:00:00Z'); // « maintenant » figé : résultats stables
const iso = (jours) => (jours === null ? null : new Date(M.getTime() - jours * JOUR).toISOString());
let numero = 0;
/** Ticket de test ; cree / maj = nombre de jours avant M (null = pas de date). */
const t = ({ statut = 'En cours', cree = 1, maj = null, assigne = 'Léa', categorie = 'Support', titre = 'T', priorite = 'Moyenne' } = {}) =>
  ({ id: `TK-${++numero}`, titre, statut, priorite, assigne, categorie, creeLe: iso(cree), majLe: iso(maj) });
const titres = (liste) => json(liste).map((x) => x.titre);

const STATUTS = ['À valider', 'Validé', 'En cours', 'Bloqué', 'Terminé', 'Rejeté'];
const TOUS = [
  t({ statut: 'À valider' }), t({ statut: 'À valider' }), t({ statut: 'Validé' }), t({ statut: 'En cours' }),
  t({ statut: 'Bloqué' }), t({ statut: 'Terminé' }), t({ statut: 'Rejeté' }), t({ statut: 'Fini' }),
];

test('kpis compte les statuts ouverts', () => {
  const k = json(ctx.kpis(TOUS, TOUS, M));
  assert.strictEqual(k.ouverts, 5);
  assert.strictEqual(k.aValider, 2);
  assert.strictEqual(k.enCours, 1);
  assert.strictEqual(k.bloques, 1);
});

test('dormant à partir de 15 jours pleins sans activité', () => {
  const dormants = (ticket) => ctx.kpis([ticket], [], M).dormants;
  assert.strictEqual(dormants(t({ maj: 14 })), 0);
  assert.strictEqual(dormants(t({ maj: 15 })), 1);
  assert.strictEqual(dormants(t({ maj: null, cree: 20 })), 1);
  assert.strictEqual(dormants(t({ maj: null, cree: null })), 0);
  assert.strictEqual(dormants(t({ statut: 'Terminé', maj: 40 })), 0);
});

test('terminés 30 j calculés sur la liste sans période', () => {
  const sansPeriode = [t({ statut: 'Terminé', maj: 29 }), t({ statut: 'Terminé', maj: 30 })];
  assert.strictEqual(ctx.kpis([], sansPeriode, M).termines30, 1);
});

test('filtrer par personne assignée, catégorie et période de création', () => {
  const a = t({ assigne: 'Léa', categorie: 'Support', cree: 6, titre: 'a' });
  const b = t({ assigne: 'Théo', categorie: 'Données', cree: 8, titre: 'b' });
  const c = t({ assigne: 'Léa', categorie: 'Données', cree: null, titre: 'c' });
  const f = (filtres) => titres(ctx.filtrer([a, b, c], { personne: '', categorie: '', periode: null, ...filtres }, M));
  assert.deepStrictEqual(f({ personne: 'Léa' }), ['a', 'c']);
  assert.deepStrictEqual(f({ categorie: 'Données' }), ['b', 'c']);
  assert.deepStrictEqual(f({ periode: 7 }), ['a']);
  assert.deepStrictEqual(f({}), ['a', 'b', 'c']);
});

test('comparaison sur 30 jours glissants', () => {
  const liste = [
    t({ cree: 1 }), t({ cree: 29 }), t({ cree: 30 }), t({ cree: 59 }), t({ cree: 60 }),
    t({ statut: 'Terminé', cree: 90, maj: 2 }), t({ statut: 'Terminé', cree: 90, maj: 45 }), t({ statut: 'Terminé', cree: 90, maj: 45 }),
  ];
  assert.deepStrictEqual(json(ctx.comparaison(liste, M)), {
    crees: { actuel: 2, precedent: 2 },
    termines: { actuel: 1, precedent: 2 },
    solde: { actuel: -1, precedent: 0 },
  });
});

test('tendance', () => {
  assert.strictEqual(ctx.tendance(5, 3), 'hausse');
  assert.strictEqual(ctx.tendance(3, 5), 'baisse');
  assert.strictEqual(ctx.tendance(4, 4), 'egal');
});

test('à traiter : bloqués d\'abord, puis les plus anciens, 5 maximum', () => {
  const liste = [
    t({ cree: 10, titre: 'jeune' }), t({ cree: 40, titre: 'vieux' }),
    t({ statut: 'Bloqué', cree: 5, titre: 'bloqué récent' }), t({ statut: 'Bloqué', cree: 20, titre: 'bloqué ancien' }),
    t({ statut: 'Validé', cree: null, titre: 'sans date' }), t({ statut: 'Terminé', cree: 100, titre: 'clos' }),
    t({ statut: 'À valider', cree: 3, titre: 'récent' }),
  ];
  assert.deepStrictEqual(titres(ctx.aTraiter(liste, M)), ['bloqué ancien', 'bloqué récent', 'vieux', 'jeune', 'récent']);
  const tous = json(ctx.aTraiter(liste, M, 10));
  assert.strictEqual(tous.length, 6);
  assert.deepStrictEqual(tous[0], { id: tous[0].id, titre: 'bloqué ancien', statut: 'Bloqué', age: 20 });
  assert.strictEqual(tous[5].titre, 'sans date');
  assert.strictEqual(tous[5].age, null);
});

test('parStatut suit l\'ordre des référentiels et ignore les statuts inconnus', () => {
  assert.deepStrictEqual(json(ctx.parStatut(TOUS, STATUTS)), [
    { nom: 'À valider', n: 2 }, { nom: 'Validé', n: 1 }, { nom: 'En cours', n: 1 },
    { nom: 'Bloqué', n: 1 }, { nom: 'Terminé', n: 1 }, { nom: 'Rejeté', n: 1 },
  ]);
});

test('regrouper par catégorie : connues, puis Sans catégorie et Hors référentiel si présents', () => {
  const liste = [t({ categorie: 'Support' }), t({ categorie: 'Support' }), t({ categorie: '' }), t({ categorie: 'Achats' })];
  assert.deepStrictEqual(json(ctx.regrouper(liste, 'categorie', ['Données', 'Support'], 'Sans catégorie')), [
    { nom: 'Données', n: 0 }, { nom: 'Support', n: 2 }, { nom: 'Sans catégorie', n: 1 }, { nom: 'Hors référentiel', n: 1 },
  ]);
  assert.deepStrictEqual(json(ctx.regrouper([t({ categorie: 'Support' })], 'categorie', ['Support'], 'Sans catégorie')),
    [{ nom: 'Support', n: 1 }]);
});

test('statutParPersonne : Non assigné et Hors référentiel seulement si présents', () => {
  const liste = [
    t({ assigne: 'Léa', statut: 'En cours' }), t({ assigne: '', statut: 'Bloqué' }),
    t({ assigne: 'Zoé', statut: 'En cours' }), t({ assigne: 'Léa', statut: 'Fini' }),
  ];
  assert.deepStrictEqual(json(ctx.statutParPersonne(liste, ['Léa', 'Théo'], ['En cours', 'Bloqué'])), {
    personnes: ['Léa', 'Théo', 'Non assigné', 'Hors référentiel'],
    series: [{ statut: 'En cours', valeurs: [1, 0, 0, 1] }, { statut: 'Bloqué', valeurs: [0, 0, 1, 0] }],
  });
  assert.deepStrictEqual(json(ctx.statutParPersonne([t({ assigne: 'Léa' })], ['Léa', 'Théo'], ['En cours'])).personnes, ['Léa', 'Théo']);
});

test('echapper neutralise le HTML', () => {
  assert.strictEqual(ctx.echapper('<img onerror="x">&\''), '&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;');
});

// --- Vue Graphe (étape 5) ---

test('brancher par statut : ordre du référentiel, branches vides omises, inconnu en Hors référentiel', () => {
  const liste = [
    t({ statut: 'Bloqué' }), t({ statut: 'En cours', priorite: 'Haute' }), t({ statut: 'En cours' }), t({ statut: 'Fini' }),
  ];
  const b = json(ctx.brancher(liste, 'statut', STATUTS, 'Sans statut', M));
  assert.deepStrictEqual(b.map((x) => x.nom), ['En cours', 'Bloqué', 'Hors référentiel']);
  assert.deepStrictEqual(b.map((x) => x.n), [2, 1, 1]);
  assert.strictEqual(b[0].hautes, 1);
  assert.strictEqual(b[1].bloques, 1);
  assert.strictEqual(b[0].tickets.length, 2);
});

test('brancher trie les cartes par priorité puis ancienneté', () => {
  const liste = [
    t({ priorite: 'Basse', cree: 50, titre: 'Basse 50' }), t({ priorite: 'Haute', cree: 2, titre: 'Haute 2' }),
    t({ priorite: 'Haute', cree: 10, titre: 'Haute 10' }), t({ priorite: 'Moyenne', cree: 5, titre: 'Moyenne 5' }),
    t({ priorite: 'Haute', cree: null, titre: 'Haute sans date' }),
  ];
  const [branche] = json(ctx.brancher(liste, 'statut', STATUTS, 'Sans statut', M));
  assert.deepStrictEqual(branche.tickets.map((x) => x.titre), ['Haute 10', 'Haute 2', 'Haute sans date', 'Moyenne 5', 'Basse 50']);
});

test('brancher par personne : assigné vide en Non assigné', () => {
  const b = json(ctx.brancher([t({ assigne: 'Léa' }), t({ assigne: '' })], 'assigne', ['Léa', 'Théo'], 'Non assigné', M));
  assert.deepStrictEqual(b.map((x) => x.nom), ['Léa', 'Non assigné']);
});

test('repartir équilibre les côtés', () => {
  const br = (...ns) => ns.map((n, i) => ({ nom: 'b' + i, n }));
  const noms = (r) => ({ gauche: r.gauche.map((x) => x.n), droite: r.droite.map((x) => x.n) });
  assert.deepStrictEqual(noms(json(ctx.repartir(br(3, 5, 1, 4)))), { gauche: [4, 3], droite: [5, 1] });
  assert.deepStrictEqual(noms(json(ctx.repartir(br(2, 2)))), { gauche: [2], droite: [2] });
  assert.deepStrictEqual(noms(json(ctx.repartir([]))), { gauche: [], droite: [] });
});
