// Garde-fou « environnement cloisonné » : aucune feuille de style externe ne doit bloquer l'affichage.
// Une <link rel="stylesheet"> classique bloque le premier rendu ; si le pare-feu ignore la requête
// au lieu de la refuser, la page reste blanche jusqu'au délai réseau (souvent 20 s ou plus).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

test('les feuilles de style externes ne bloquent pas le rendu', () => {
  const html = fs.readFileSync('src/Index.html', 'utf8');
  const externes = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]
    .map(([balise]) => balise)
    .filter((balise) => /href="https?:/.test(balise));
  assert.ok(externes.length > 0, 'la police Inter doit rester chargée');
  for (const balise of externes) {
    assert.match(balise, /media="print"/, balise);
    assert.match(balise, /onload="this\.media='all'"/, balise);
  }
});
