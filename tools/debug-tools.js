// ./tools/debug-tools.js  — v5
console.log("[DebugTools] geladen v5");

let AUTO_SCROLL = true;
let ACTIVE_FILTER = "all"; // all | log | warn | error

document.addEventListener('DOMContentLoaded', () => {
  // === Dock (Toolbar) =================================================
  const dock = document.createElement('div');
  dock.id = 'debugToolsDock';
  dock.textContent = '🔧 Debug‑Tools';
  Object.assign(dock.style, baseBoxStyle(), {
    position: 'fixed',
    padding: '6px 10px',
    font: '12px ui-monospace',
    cursor: 'pointer',
    zIndex: 99999,
  });
  document.body.appendChild(dock);

  // === Overlay (Konsole) ==============================================
  const overlay = document.createElement('div');
  overlay.id = 'debugOverlay';
  Object.assign(overlay.style, baseBoxStyle(), {
    position: 'fixed',
    display: 'none',
    zIndex: 99998,
    maxHeight: '40vh',
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

  // Filter-Buttons
  const filters = document.createElement('div');
  const mkBtn = (label, type) => {
    const b = document.createElement('button');
    b.textContent = label; b.dataset.type = type;
    Object.assign(b.style, buttonStyle());
    b.onclick = () => setFilter(type);
    return b;
  };
  const btnAll   = mkBtn('All',   'all');
  const btnInfo  = mkBtn('Info',  'log');
  const btnWarn  = mkBtn('Warn',  'warn');
  const btnError = mkBtn('Error', 'error');
  filters.append(btnAll, btnInfo, btnWarn, btnError);
  head.prepend(filters);

  // Right controls
  const right = document.createElement('div');
  const btnAuto  = mkButton('Auto‑Scroll: ON', () => {
    AUTO_SCROLL = !AUTO_SCROLL;
    btnAuto.textContent = `Auto‑Scroll: ${AUTO_SCROLL ? 'ON' : 'OFF'}`;
  });
  const btnClear = mkButton('Clear', () => { body.innerHTML = ''; });
  const btnClose = mkButton('Close', () => { overlay.style.display = 'none'; });
  right.append(btnAuto, btnClear, btnClose);
  head.appendChild(right);

  // Body (scrollbar)
  const body = document.createElement('div');
  Object.assign(body.style, {
    padding: '8px 10px',
    font: '12px/1.4 ui-monospace',
    overflow: 'auto',
    maxHeight: 'calc(40vh - 42px)'
  });
  overlay.appendChild(body);
  document.body.appendChild(overlay);

  // Interaktion
  dock.addEventListener('click', () => {
    overlay.style.display = (overlay.style.display === 'none') ? 'block' : 'none';
    layout(); // sicherstellen, dass Position passt
  });

  function setFilter(type) {
    ACTIVE_FILTER = type;
    [btnAll, btnInfo, btnWarn, btnError].forEach(b=>{
      b.style.outline = (b.dataset.type === type) ? '2px solid #2f7de1' : 'none';
    });
    [...body.children].forEach(line => {
      const t = line.dataset.type || 'log';
      line.style.display = (type === 'all' || t === type) ? '' : 'none';
    });
  }
  setFilter('all');

  // Log in Overlay „tee’en“
  ['log','warn','error'].forEach(type => {
    const orig = console[type].bind(console);
    console[type] = (...args) => {
      try { orig(...args); } catch {}
      try { logToOverlay(type, args); } catch {}
    };
  });

  function logToOverlay(type, args) {
    const line = document.createElement('div');
    line.dataset.type = type;
    line.style.whiteSpace = 'pre-wrap';
    line.style.color = (type === 'error') ? '#ff6b6b'
                    : (type === 'warn')  ? '#f3d250'
                    : '#cfe3ff';
    const ts = new Date().toLocaleTimeString();
    line.textContent = `[${ts}] [${type}] ` + args.map(String).join(' ');
    body.appendChild(line);
    if (!(ACTIVE_FILTER === 'all' || ACTIVE_FILTER === type)) {
      line.style.display = 'none';
    }
    if (AUTO_SCROLL) body.scrollTop = body.scrollHeight;
  }

  // === Deine Checks (angepasste Pfade) ================================
  window.addEventListener('error', e => {
    console.error('🔥 Fehler:', e.message, 'bei', e.filename, 'Zeile', e.lineno);
  });
  window.addEventListener('unhandledrejection', e => {
    console.error('🔥 Unhandled Promise Rejection:', e.reason);
  });

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
  function logFolderStructure(map) {
    for (const folder in map) {
      for (const file of map[folder]) {
        const path = `./${folder}/${file}`;
        fetch(path, { cache: 'no-cache' })
          .then(r => console.log(r.ok ? '✅' : '❌', path));
      }
    }
  }

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

  // === Responsive Andocken (oben/seite) ================================
  function layout() {
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    if (portrait) {
      // Dock oben mittig
      Object.assign(dock.style, { left: '50%', right: '', top: '8px', bottom: '', transform: 'translateX(-50%)' });
      // Overlay darunter
      const dockRect = dock.getBoundingClientRect();
      Object.assign(overlay.style, {
        left: '8px',
        right: '8px',
        top: `${dockRect.bottom + 8}px`,
        bottom: '8px',
        maxHeight: '40vh'
      });
    } else {
      // Dock rechts mittig
      const midY = Math.max(60, window.innerHeight / 2 - 16);
      Object.assign(dock.style, { top: `${midY}px`, bottom: '', right: '8px', left: '', transform: 'none' });
      // Overlay links daneben
      const dockRect = dock.getBoundingClientRect();
      Object.assign(overlay.style, {
        left: '8px',
        right: `${window.innerWidth - dockRect.left + 8}px`,
        top: '8px',
        bottom: '8px',
        maxHeight: ''
      });
    }
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });
});

// === helpers ===========================================================
function baseBoxStyle() {
  return {
    background: '#0c1320cc',
    color: '#cfe3ff',
    border: '1px solid #21334d',
    borderRadius: '10px',
    boxShadow: '0 12px 30px rgba(0,0,0,.35)',
    backdropFilter: 'blur(4px)'
  };
}
function buttonStyle() {
  return {
    background: '#0f1b29',
    color: '#cfe3ff',
    border: '1px solid #21334d',
    borderRadius: '8px',
    padding: '4px 8px',
    cursor: 'pointer'
  };
}
function mkButton(label, onclick) {
  const b = document.createElement('button');
  b.textContent = label; b.onclick = onclick;
  Object.assign(b.style, buttonStyle(), { marginLeft: '6px' });
  return b;
}
