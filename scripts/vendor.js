// Génère src/Vendor.html à partir d'ECharts installé par npm (version fixée dans package.json).
// Embarqué plutôt que chargé par CDN : l'application doit marcher sur un réseau qui filtre les CDN.
const fs = require('node:fs');
const { version } = require('echarts/package.json');
const code = fs.readFileSync(require.resolve('echarts/dist/echarts.min.js'), 'utf8');
fs.writeFileSync('src/Vendor.html',
  `<script>\n/* ECharts ${version} — Apache License 2.0 — fichier généré par npm run vendor, ne pas modifier */\n${code}\n</script>\n`);
console.log(`src/Vendor.html : ECharts ${version}, ${(code.length / 1024).toFixed(0)} Ko`);
