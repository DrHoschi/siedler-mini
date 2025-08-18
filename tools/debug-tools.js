// tools/debug-tools.js
// ======================================================
// 🔧 Universal Debug-Tools (per Flags schaltbar)
// true = aktiv, false = aus
const ENABLE = {
  loadTester:     true,   // Script-Load-Tester (asset.js / map-runtime.js)
  errorLogger:    true,   // Globaler Error-Logger
  perfLogger:     false,  // Performance-Zeiterfassung
  assetChecker:   true,   // checkAssets([...])
  folderLogger:   true,   // Ordnerstruktur-Logger
  mapLoaderDebug: false   // map-pro.json laden & ausgeben
};

// 1) Script-Load-Tester
if (ENABLE.loadTester) {
  const add = (src, label) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload  = () => console.log(`✅ ${label} geladen`);
    s.onerror = () => console.error(`❌ ${label} fehlt (${src})`);
    document.head.appendChild(s);
  };
  add('./core/asset.js', 'asset.js');
  add('./tools/map-runtime.js', 'map-runtime.js');
}

// 2) Globaler Error-Logger
if (ENABLE.errorLogger) {
  window.addEventListener('error', e => {
    console.error('🔥 Fehler:', e.message, 'bei', e.filename, 'Zeile', e.lineno);
  });
  window.addEventListener('unhandledrejection', e => {
    console.error('🔥 Unhandled Promise Rejection:', e.reason);
  });
}

// 3) Performance-Logger
if (ENABLE.perfLogger) {
  console.time('⏱️ Gesamt-Ladezeit');
  window.addEventListener('load', () => console.timeEnd('⏱️ Gesamt-Ladezeit'));
}

// 4) Asset-Checker
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
if (ENABLE.assetChecker) {
  checkAssets([
    './core/asset.js',          // Haupt-Asset
    './tools/map-runtime.js',   // Karten-Engine
    './maps/map-pro.json',      // Map-Datei
    './assets/tileset.png',     // Beispielgrafik
    './assets/sprites.png'      // Beispielsprites
  ]);
}

// 5) Ordnerstruktur-Logger
if (ENABLE.folderLogger) {
  const folders = {
    core:   ['asset.js'],
    tools:  ['map-runtime.js'],
    maps:   ['map-pro.json'],
    assets: ['tileset.png', 'sprites.png']
  };
  for (const folder in folders) {
    for (const file of folders[folder]) {
      const path = `./${folder}/${file}`;
      fetch(path, { cache: 'no-cache' })
        .then(r => console.log(r.ok ? '✅' : '❌', path));
    }
  }
}

// 6) Map-Loader Debug
if (ENABLE.mapLoaderDebug) {
  (async () => {
    try {
      const res = await fetch('./maps/map-pro.json', { cache: 'no-cache' });
      const json = await res.json();
      console.log('🗺️ Map geladen:', json);
    } catch (err) {
      console.error('❌ Map konnte nicht geladen werden:', err);
    }
  })();
}
