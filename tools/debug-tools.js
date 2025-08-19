// ./tools/debug-tools.js
// ======================================================
// 🔧 Debug-Tools (sichtbarer Banner + sichere Checks)
// Läuft ohne andere Skripte nachzuladen (keine Konflikte).

alert("DebugTools geladen"); // TEMP: prüft, dass die Datei wirklich läuft

console.log("[DebugTools] geladen");

// 0) Sichtbarer Banner, damit du SOFORT siehst, dass die Datei läuft
(() => {
  const bar = document.createElement('div');
  bar.id = 'debugToolsBar';
  bar.textContent = '🔧 Debug-Tools aktiv';
  Object.assign(bar.style, {
    position: 'fixed', left: '50%', top: '10px', transform: 'translateX(-50%)',
    background: '#0c1320cc', color: '#cfe3ff', border: '1px solid #21334d',
    borderRadius: '10px', padding: '8px 12px', zIndex: 99999, font: '12px ui-monospace'
  });
  document.body.appendChild(bar);
})();

// 1) Globaler Error-/Promise-Logger
window.addEventListener('error', e => {
  console.error('🔥 Fehler:', e.message, 'bei', e.filename, 'Zeile', e.lineno);
});
window.addEventListener('unhandledrejection', e => {
  console.error('🔥 Unhandled Promise Rejection:', e.reason);
});

// 2) Performance (optional: auf true setzen)
const PERF = false;
if (PERF) {
  console.time('⏱️ Gesamt-Ladezeit');
  window.addEventListener('load', () => console.timeEnd('⏱️ Gesamt-Ladezeit'));
}

// 3) Asset-Checker – nur prüfen, nichts laden
async function checkAssets(files) {
  for (const f of files) {
    try {
      const res = await fetch(f, { cache: 'no-cache' });
      if (res.ok) console.log('✅ Gefunden:', f);
      else        console.warn('⚠️ Nicht geladen:', f, res.status);
    } catch (err) {
      console.error('❌ Fehler:', f, err);
    }
  }
}

// 4) Ordnerstruktur-Logger – nur prüfen, nichts laden
function logFolderStructure(map) {
  for (const folder in map) {
    for (const file of map[folder]) {
      const path = `./${folder}/${file}`;
      fetch(path, { cache: 'no-cache' })
        .then(r => console.log(r.ok ? '✅' : '❌', path));
    }
  }
}

// ==== HIER ANPASSEN: Was soll geprüft werden? ====
checkAssets([
  './core/asset.js',
  './tools/map-runtime.js',
  './maps/map-pro.json',
  './assets/tileset.png',
  './assets/sprites.png'
]);

logFolderStructure({
  core:   ['asset.js'],
  tools:  ['map-runtime.js'],
  maps:   ['map-pro.json'],
  assets: ['tileset.png', 'sprites.png']
});
