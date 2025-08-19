// ./tools/debug-tools.js
// ======================================================
// 🔧 Debug-Tools (Dock unten + Overlay mit Filtern/Autoscroll)

console.log("[DebugTools] geladen");

// ====== State ======
let AUTO_SCROLL = true;
let ACTIVE_FILTER = "all"; // "all" | "log" | "warn" | "error"

document.addEventListener('DOMContentLoaded', () => {
  // ===== Dock (unten, schmaler Button) =====
  const dock = document.createElement('div');
  dock.id = 'debugToolsDock';
  dock.textContent = '🔧 Debug‑Tools';
  Object.assign(dock.style, {
    position: 'fixed', left: '50%', bottom: '8px', transform: 'translateX(-50%)',
    background: '#0c1320cc', color: '#cfe3ff', border: '1px solid #21334d',
    borderRadius: '10px', padding: '6px 10px', zIndex: 99999, font: '12px ui-monospace',
    cursor: 'pointer', userSelect: 'none', boxShadow: '0 12px 30px rgba(0,0,0,.35)'
  });
  document.body.appendChild(dock);

  // ===== Overlay =====
  const overlay = document.createElement('div');
  overlay.id = 'debugOverlay';
  Object.assign(overlay.style, {
    position: 'fixed', left: '8px', right: '8px', bottom: '44px', /* Platz fürs Dock */
    maxHeight: '40vh', background: '#0c1320cc', border: '1px solid #21334d',
    color: '#cfe3ff', borderRadius: '10px', zIndex: 99998, display: 'none',
    boxShadow: '0 12px 40px rgba(0,0,0,.35)', backdropFilter: 'blur(4px)'
  });

  // Header
  const head = document.createElement('div');
  Object.assign(head.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 10px', borderBottom: '1px solid #21334d',
    font: '12px ui-monospace', gap: '8px'
  });
  head.innerHTML = `<span>🧪 Debug‑Konsole</span>`;
  overlay.appendChild(head);

  // Controls links: Filter
  const filters = document.createElement('div');
  const mkBtn = (label, type) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.dataset.type = type;
    Object.assign(b.style, {
      background: '#0f1b29', color: '#cfe3ff', border: '1px solid #21334d',
      borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', marginRight: '6px'
    });
    b.onclick = () => { setFilter(type); };
    return b;
  };
  const btnAll   = mkBtn('All',   'all');
  const btnInfo  = mkBtn('Info',  'log');
  const btnWarn  = mkBtn('Warn',  'warn');
  const btnError = mkBtn('Error', 'error');
  filters.append(btnAll, btnInfo, btnWarn, btnError);
  head.prepend(filters);

  // Controls rechts: AutoScroll / Clear / Close
  const right = document.createElement('div');
  const btnAuto = document.createElement('button');
  const btnClear = document.createElement('button');
  const btnClose = document.createElement('button');
  [btnAuto, btnClear, btnClose].forEach(b => Object.assign(b.style, {
    background: '#0f1b29', color: '#cfe3ff', border: '1px solid #21334d',
    borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', marginLeft: '6px'
  }));
  btnAuto.textContent = `Auto‑Scroll: ON`;
  btnClear.textContent = 'Clear';
  btnClose.textContent = 'Close';
  right.append(btnAuto, btnClear, btnClose);
  head.appendChild(right);

  // Body (scrollbar)
  const body = document.createElement('div');
  Object.assign(body.style, {
    padding: '8px 10px', font: '12px/1.4 ui-monospace',
    overflow: 'auto', maxHeight: 'calc(40vh - 42px)'
  });
  overlay.appendChild(body);

  document.body.appendChild(overlay);

  // Dock klick toggelt Overlay
  dock.addEventListener('click', () => {
    overlay.style.display = (overlay.style.display === 'none') ? 'block' : 'none';
  });
  // Close
  btnClose.addEventListener('click', () => overlay.style.display = 'none');
  // Clear
  btnClear.addEventListener('click', () => { body.innerHTML = ''; });
  // AutoScroll togglen
  btnAuto.addEventListener('click', () => {
    AUTO_SCROLL = !AUTO_SCROLL;
    btnAuto.textContent = `Auto‑Scroll: ${AUTO_SCROLL ? 'ON' : 'OFF'}`;
  });

  // Filter-Funktion
  function setFilter(type) {
    ACTIVE_FILTER = type;
    // Buttons optisch markieren
    [btnAll, btnInfo, btnWarn, btnError].forEach(b=>{
      b.style.outline = (b.dataset.type === type) ? '2px solid #2f7de1' : 'none';
    });
    // Zeilen filtern
    [...body.children].forEach(line => {
      const t = line.dataset.type || 'log';
      line.style.display = (type === 'all' || t === type) ? '' : 'none';
    });
  }
  setFilter('all'); // default

  // Logs ins Overlay schreiben
  function logToOverlay(type, args) {
    const line = document.createElement('div');
    line.dataset.type = type; // für Filter
    line.style.whiteSpace = 'pre-wrap';
    line.style.color = (type === 'error') ? '#ff6b6b'
                    : (type === 'warn')  ? '#f3d250'
                    : '#cfe3ff';
    const ts = new Date().toLocaleTimeString();
    line.textContent = `[${ts}] [${type}] ` + args.map(String).join(' ');
    body.appendChild(line);

    // Filter live anwenden
    if (!(ACTIVE_FILTER === 'all' || ACTIVE_FILTER === type)) {
      line.style.display = 'none';
    }

    // Auto-Scroll
    if (AUTO_SCROLL) {
      body.scrollTop = body.scrollHeight;
    }
  }

  // Konsole „tee’en“: Original + Overlay
  ['log','warn','error'].forEach(type => {
    const orig = console[type].bind(console);
    console[type] = (...args) => {
      try { orig(...args); } catch {}
      try { logToOverlay(type, args); } catch {}
    };
  });

  // ===== Deine bestehenden Tools =====

  // Error-/Promise-Logger
  window.addEventListener('error', e => {
    console.error('🔥 Fehler:', e.message, 'bei', e.filename, 'Zeile', e.lineno);
  });
  window.addEventListener('unhandledrejection', e => {
    console.error('🔥 Unhandled Promise Rejection:', e.reason);
  });

  // Asset-Checker – nur prüfen, nichts laden
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

  // Ordnerstruktur-Logger – nur prüfen, nichts laden
  function logFolderStructure(map) {
    for (const folder in map) {
      for (const file of map[folder]) {
        const path = `./${folder}/${file}`;
        fetch(path, { cache: 'no-cache' })
          .then(r => console.log(r.ok ? '✅' : '❌', path));
      }
    }
  }

  // === HIER anpassen: was prüfen? (mit deinem Fix assets.js) ===
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

}); // DOMContentLoaded
