// Garde-fous sur la feuille de style : contraste AA et comportement du cadre du graphe.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const css = fs.readFileSync('src/Styles.html', 'utf8');
const jetons = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(([, n, v]) => [n, v]));
/** Déclarations du premier bloc dont le sélecteur est exactement `selecteur`. */
const regle = (selecteur) => {
  const m = css.match(new RegExp(`(?:^|\\n)\\s*${selecteur.replace('.', '\\.')}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `règle ${selecteur} introuvable`);
  return Object.fromEntries(m[1].split(';').map((d) => d.split(':').map((x) => x.trim())).filter(([p]) => p));
};
const couleur = (v) => (v.startsWith('var(') ? jetons[v.slice(6, -1)] : v.replace(/^#fff$/i, '#FFFFFF'));
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('le texte des branches du graphe est lisible (AA ≥ 4,5:1)', () => {
  const { background, color } = regle('.branche');
  assert.ok(contraste(couleur(color), couleur(background)) >= 4.5, `${color} sur ${background}`);
});

test('le cadre du graphe ne défile pas quand le focus clavier atteint une carte hors champ', () => {
  // overflow: hidden reste un conteneur défilable ; clip ne l'est pas, donc la caméra reste la seule source de vérité.
  assert.strictEqual(regle('.vue-arbre').overflow, 'clip');
});
