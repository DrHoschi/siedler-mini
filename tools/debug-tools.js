// ./tools/debug-tools.js
// ======================================================
// 🔧 Debug-Tools (sichtbarer Banner + sichere Checks)
// Läuft ohne andere Skripte nachzuladen (keine Konflikte).

// TEMP: Prüft, dass die Datei sicher geladen wird (kannst du später löschen)
alert("DebugTools geladen"); // TEMP zum Test, später entfernen
console.log("[DebugTools] geladen");

// ======================================================================
// 🔼 NEU: Mini-Debug-Konsole im Spiel (Overlay) + klickbarer Banner
// - Banner oben mittig -> Klick toggelt Overlay
// - Overlay zeigt console.log / warn / error live im Spiel
// - Buttons: Clear (löschen), Close (verbergen)
// ======================================================================

document.addEventListener('DOMContentLoaded', () => {
  // === Banner erzeugen (sichtbarer „Schalter“) ===
  const bar = document.createElement('div');
  bar.id = 'debugToolsBar';
  bar.textContent = '🔧 Debug-Tools (klick mich)';
  Object.assign(bar.style, {
    position: 'fixed', left: '50%', top: '10px', transform: 'translateX(-50%)',
    background: '#0c1320cc', color: '#cfe3ff', border: '1px solid #21334d',
    borderRadius: '10px', padding: '8px 12px', zIndex: 99999, font: '12px ui-monospace',
    cursor: 'pointer', userSelect: 'none'
  });
  document.body.appendChild(bar);

  // === Overlay (Container) ===
  const overlay = document.createElement('div');
  overlay.id = 'debugOverlay';
  Object.assign(overlay.style, {
    position: 'fixed', left: '8px', right: '8px', bottom: '8px',
    maxHeight: '40vh', background: '#0c1320cc', border: '1px solid #21334d',
    color: '#cfe3ff', borderRadius: '10px', zIndex: 99998, display: 'none',
    boxShadow: '0 12px 40px rgba(0,0,0,.35)', backdropFilter: 'blur(4px)'
  });

  // === Overlay: Kopfzeile mit Buttons ===
  const head = document.createElement('div');
  Object.assign(head.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 10px', borderBottom: '1px solid #21334d',
    font: '12px ui-monospace'
  });
  head.innerHTML = `<span>🧪 Debug-Konsole</span>`;
  overlay.appendChild(head);

  // Buttons rechts
  const btns = document.createElement('div');
  const btnClear = document.createElement('button');
  const btnClose = document.createElement('button');
  [btnClear, btnClose].forEach(b => Object.assign(b.style, {
    background: '#0f1b29', color: '#cfe3ff', border: '1px solid #21334d',
    borderRadius: '8px', padding: '4px 8px', marginLeft: '6px', cursor: 'pointer'
  }));
  btnClear.textContent = 'Clear';
  btnClose.textContent = 'Close';
  btns.append(btnClear, btnClose);
  head.appendChild(btns);

  // === Overlay: Log-Container ===
  const body = document.createElement('div');
  Object.assign(body.style, {
    padding: '8px 10px', font: '12px/1.4 ui-monospace', overflow: 'auto',
    maxHeight: 'calc(40vh - 42px)'
  });
  overlay.appendChild(body);

  document.body.appendChild(overlay);

  // Toggle per Banner-Klick
  bar.addEventListener('click', () => {
    overlay.style.display = (overlay.style.display === 'none') ? 'block' : 'none';
  });
  // Close-Button
  btnClose.addEventListener('click', () => overlay.style.display = 'none');
  // Clear-Button
  btnClear.addEventListener('click', () => { body.innerHTML = ''; });

  // === Log-Funktion: schreibt in Overlay + scrollt nach unten ===
  function logToOverlay(type, args) {
    const line = document.createElement('div');
    // Farbe je nach Typ
    line.style.whiteSpace = 'pre-wrap';
    line.style.color = (type === 'error') ? '#ff6b6b'
                  : (type === 'warn')  ? '#f3d250'
                  : '#cfe3ff';
    // Zeitstempel + Inhalt
    const ts = new Date().toLocaleTimeString();
    line.textContent = `[${ts}] [${type}] ` + args.map(String).join(' ');
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  // === Konsole „tee’en“: Original beibehalten, zusätzlich ins Overlay schreiben ===
  ['log','warn','error'].forEach(type => {
    const orig = console[type].bind(console);
    console[type] = (...args) => {
      try { orig(...args); } catch {}
      try { logToOverlay(type, args); } catch {}
    };
  });
});

// ======================================================================
// 1) Globaler Error-/Promise-Logger (wie gehabt)
// ======================================================================
window.addEventListener('error', e => {
  console.error('🔥 Fehler:', e.message, 'bei', e.filename, 'Zeile', e.lineno);
});
window.addEventListener('unhandledrejection', e => {
  console.error('🔥 Unhandled Promise Rejection:', e.reason);
});

// ======================================================================
// 2) Performance (optional: auf true setzen)
// ======================================================================
const PERF = false;
if (PERF) {
  console.time('⏱️ Gesamt-Ladezeit');
  window.addEventListener('load', () => console.timeEnd('⏱️ Gesamt-Ladezeit'));
}

// ======================================================================
// 3) Asset-Checker – nur prüfen, nichts laden (wie bei dir)
// ======================================================================
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

// ======================================================================
// 4) Ordnerstruktur-Logger – nur prüfen, nichts laden (wie bei dir)
// ======================================================================
function logFolderStructure(map) {
  for (const folder in map) {
    for (const file of map[folder]) {
      const path = `./${folder}/${file}`;
      fetch(path, { cache: 'no-cache' })
        .then(r => console.log(r.ok ? '✅' : '❌', path));
    }
  }
}

// ======================================================================
// 5) HIER passt du an, was geprüft werden soll (wie bei dir) 
// ======================================================================
checkAssets([
  './core/assets.js',
  './tools/map-runtime.js',
  './maps/map-pro.json',
  './assets/tileset.png',
  './assets/sprites.png'
]);

logFolderStructure({
  core:   ['assets.js'],
  tools:  ['map-runtime.js'],
  maps:   ['map-pro.json'],
  assets: ['tileset.png', 'sprites.png']
});
