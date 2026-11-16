// ECharts est embarqué (pas de CDN) : on vérifie que le fichier généré est complet et à la bonne version.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

test('Vendor.html est généré depuis echarts 6.1.0', () => {
  const html = fs.readFileSync('src/Vendor.html', 'utf8');
  assert.ok(html.startsWith('<script>'));
  assert.ok(html.endsWith('</script>\n'));
  assert.match(html, /Apache License/);
  assert.match(html, /6\.1\.0/);
  assert.doesNotMatch(html, /jsdelivr|cdn\./);
});
