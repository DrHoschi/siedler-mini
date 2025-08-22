<script>
// ===== Debug Overlay + Asset Scanner =====================================
// Einfach in index.html *nach* boot.js laden.
// Öffnet ein Overlay und prüft das Laden einer Asset-Liste.

(function(){
  const STYLE = `
  #dbgOverlay{position:fixed;inset:auto 8px 8px auto; min-width:280px; max-width:92vw;
    background:#0f1d31; color:#cfe3ff; border:1px solid #1e2d42; border-radius:10px;
    box-shadow:0 12px 40px rgba(0,0,0,.35); font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto;
    z-index:999999; display:none}
  #dbgOverlay header{display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #1e2d42}
  #dbgOverlay header strong{font-size:15px}
  #dbgOverlay .body{max-height:50vh; overflow:auto; padding:8px 10px}
  #dbgOverlay .row{display:flex; justify-content:space-between; gap:10px; padding:4px 0; border-bottom:1px dotted #20324a}
  #dbgOverlay .ok{color:#77e29f} .fail{color:#ff8890}
  #dbgOverlay .muted{opacity:.8}
  #dbgBtns{position:fixed; right:8px; top:64px; display:flex; gap:8px; z-index:999999}
  #dbgBtns button{background:#0f1b29; border:1px solid #1b2a40; color:#cfe3ff; border-radius:10px; padding:6px 10px; font:14px}
  `;
  const CSS = document.createElement('style'); CSS.textContent = STYLE; document.head.appendChild(CSS);

  // Floating Buttons (Assets-Scan + Info)
  const btns = document.createElement('div');
  btns.id = 'dbgBtns';
  btns.innerHTML = `
    <button id="btnScan">Assets-Scan</button>
    <button id="btnInfo">Info</button>
  `;
  document.body.appendChild(btns);

  // Overlay
  const box = document.createElement('div');
  box.id = 'dbgOverlay';
  box.innerHTML = `
    <header>
      <strong>Diagnose</strong>
      <span class="muted" id="dbgSummary"></span>
      <div style="margin-left:auto;display:flex;gap:6px">
        <button id="dbgClose" style="background:#3a1b1b;border:1px solid #6a2d2d;color:#ffd2d2;border-radius:8px;padding:4px 8px">schließen</button>
      </div>
    </header>
    <div class="body" id="dbgBody"></div>
  `;
  document.body.appendChild(box);

  function openOverlay() { box.style.display = 'block'; }
  function closeOverlay() { box.style.display = 'none'; }
  document.getElementById('dbgClose').onclick = closeOverlay;

  // ------- Helfer
  function row(label, status, extra=''){
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `<span>${label}</span><span class="${status?'ok':'fail'}">${status?'OK':'FEHLT'}${extra?` <span class="muted">${extra}</span>`:''}</span>`;
    return div;
  }

  function testImage(url){
    return new Promise(resolve=>{
      const img = new Image();
      img.onload = ()=> resolve({url, ok:true, w:img.naturalWidth, h:img.naturalHeight});
      img.onerror = ()=> resolve({url, ok:false});
      img.src = url + (url.includes('?')?'&':'?') + 'cb=' + Date.now(); // Cache-Bust
    });
  }

  // ------- Standardliste
  const DEFAULT_LIST = [
    // Boden (topdown_*)
    'assets/tex/topdown_grass.png',
    'assets/tex/topdown_dirt.png',
    'assets/tex/topdown_forest.png',
    'assets/tex/topdown_water.png',
    // Straßen (autotiles)
    'assets/tex/topdown_road_straight.png',
    'assets/tex/topdown_road_corner.png',
    'assets/tex/topdown_road_t.png',
    'assets/tex/topdown_road_cross.png',
    // Gebäude (topdown)
    'assets/tex/topdown_hq.png',
    'assets/tex/topdown_depot.png',
    'assets/tex/topdown_woodcutter.png',
    // Neue path-Texturen (PNG/JPEG)
    'assets/tex/terrain/path0.png',
    'assets/tex/terrain/path1.png',
    'assets/tex/terrain/path2.png',
    'assets/tex/terrain/path3.png',
    'assets/tex/terrain/path4.png',
    'assets/tex/terrain/path5.png',
    'assets/tex/terrain/path6.png',
    'assets/tex/terrain/path0.jpeg',
    'assets/tex/terrain/path1.jpeg',
    'assets/tex/terrain/path2.jpeg',
    'assets/tex/terrain/path3.jpeg',
    'assets/tex/terrain/path4.jpeg',
    'assets/tex/terrain/path5.jpeg',
    'assets/tex/terrain/path6.jpeg',
    // Platzhalter
    'assets/tex/placeholder64.png',
    'assets/carrier.png',
    'assets/carrier.json'
  ];

  async function scanAssets(list){
    const body = document.getElementById('dbgBody');
    body.innerHTML = '';
    const results = await Promise.all(list.map(testImage));
    let ok=0, fail=0;
    results.forEach(r=>{
      if (r.ok){ ok++; body.appendChild(row(r.url, true, `${r.w||'?'}×${r.h||'?'}`)); }
      else { fail++; body.appendChild(row(r.url, false)); }
    });
    document.getElementById('dbgSummary').textContent = ` Assets: ${ok} ok / ${fail} fehlen`;
    openOverlay();
    console.log('[Assets-Scan]', results);
  }

  function infoPanel(){
    const body = document.getElementById('dbgBody');
    body.innerHTML = '';
    const lines = [];
    try{
      const s = window.__GAME_STATE__ || (window.game && window.game.state);
      if (s){
        lines.push(['Zoom', (s.zoom||s.camera?.zoom||1).toFixed ? (s.zoom||s.camera.zoom).toFixed(2)+'x' : String(s.zoom||s.camera?.zoom)]);
        lines.push(['Cam', `${Math.round(s.camX||s.camera?.x||0)}, ${Math.round(s.camY||s.camera?.y||0)}`]);
        lines.push(['DPR', String(s.DPR||window.devicePixelRatio||1)]);
        lines.push(['Canvas', `${s.width||s.canvas?.width||'?'}×${s.height||s.canvas?.height||'?'}`]);
        lines.push(['Objekte', `roads:${s.roads?.length||0} blds:${s.buildings?.length||0}`]);
      }
    }catch(e){/*noop*/}
    if (!lines.length){ lines.push(['Hinweis', 'Kein Spiel-State gefunden.']); }
    lines.forEach(([k,v])=>{
      const div = document.createElement('div');
      div.className = 'row';
      div.innerHTML = `<span>${k}</span><span class="muted">${v}</span>`;
      body.appendChild(div);
    });
    document.getElementById('dbgSummary').textContent = ' Systeminfo';
    openOverlay();
  }

  // Button-Wiring
  document.getElementById('btnScan').onclick = ()=> scanAssets((window.ASSET_CHECK_LIST && window.ASSET_CHECK_LIST.length)? window.ASSET_CHECK_LIST : DEFAULT_LIST);
  document.getElementById('btnInfo').onclick = infoPanel;

  // Expose für Konsole
  window.__runAssetScan = ()=> scanAssets((window.ASSET_CHECK_LIST && window.ASSET_CHECK_LIST.length)? window.ASSET_CHECK_LIST : DEFAULT_LIST);
  window.__dbgInfo = infoPanel;
})();
</script>
/* ---------------------------------------------------------
 * Debug Saver – Log sammeln & als .txt speichern
 * Drop-in: ans Ende von debug.js einfügen (oder separat laden)
 * Stellt global bereit:
 *   - logDebug(...args)
 *   - saveDebugLog(filename?)
 *   - debugGetLog()
 *   - debugClearLog()
 * --------------------------------------------------------- */
(() => {
  // Mehrfach-Init verhindern
  if (window.__DEBUG_SAVER_READY__) return;
  window.__DEBUG_SAVER_READY__ = true;

  const MAX_LINES = 50000;           // großer Ringpuffer
  const lines = [];
  const startedAt = new Date();

  // Zeitstempel
  const ts = () => new Date().toISOString();

  // Robustes Stringify
  const toStr = (v) => {
    if (v instanceof Error) return `${v.name}: ${v.message}\n${v.stack || ''}`;
    try {
      if (typeof v === 'object' && v !== null) return JSON.stringify(v, null, 2);
    } catch (_) {}
    return String(v);
  };

  // Eine Zeile hinzufügen
  const pushLine = (level, args) => {
    const msg = args.map(toStr).join(' ');
    lines.push(`[${ts()}] ${level.toUpperCase()}: ${msg}`);
    if (lines.length > MAX_LINES) lines.shift();

    // Optionales Overlay live aktualisieren
    const el = document.getElementById('debugOutput');
    if (el) el.textContent = lines.slice(-500).join('\n');
  };

  // Öffentliche API
  function logDebug(...args){ pushLine('debug', args); }
  function debugGetLog(){ return lines.join('\n'); }
  function debugClearLog(){ lines.length = 0; }

  // Globale Fehler
  window.addEventListener('error', (e) => {
    pushLine('error', [e.message, '@', e.filename, ':', e.lineno, e.colno]);
    if (e.error && e.error.stack) pushLine('error', [e.error.stack]);
  });
  window.addEventListener('unhandledrejection', (e) => {
    pushLine('error', ['UnhandledRejection:', toStr(e.reason)]);
  });

  // Konsole abgreifen (ohne Original zu verlieren)
  if (!window.__CONSOLE_ORIG__) {
    window.__CONSOLE_ORIG__ = {
      log: console.log, warn: console.warn, error: console.error, info: console.info
    };
    console.log  = (...a)=>{ pushLine('log',  a); window.__CONSOLE_ORIG__.log.apply(console, a);  };
    console.warn = (...a)=>{ pushLine('warn', a); window.__CONSOLE_ORIG__.warn.apply(console, a); };
    console.error= (...a)=>{ pushLine('error',a); window.__CONSOLE_ORIG__.error.apply(console, a);};
    console.info = (...a)=>{ pushLine('info', a); window.__CONSOLE_ORIG__.info.apply(console, a); };
  }

  // Datei speichern
  function saveDebugLog(filename){
    const header = [
      '=== Siedler‑Mini Debug Log ===',
      `Started:   ${startedAt.toISOString()}`,
      `Captured:  ${new Date().toISOString()}`,
      `URL:       ${location.href}`,
      `UA:        ${navigator.userAgent}`,
      `Platform:  ${navigator.platform}`,
      ''
    ].join('\n');

    const blob = new Blob([header, debugGetLog(), '\n'], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const stamp= new Date().toISOString().replace(/[:.]/g,'-');
    a.href = url;
    a.download = filename || `siedler-mini-debug-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Button auto‑verdrahten (falls vorhanden)
  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('saveDebugBtn');
    if (btn && !btn.__wired__) {
      btn.__wired__ = true;
      btn.addEventListener('click', () => saveDebugLog());
    }
  });

  // Global verfügbar machen (überschreibt nichts, falls schon da)
  window.logDebug      = window.logDebug      || logDebug;
  window.saveDebugLog  = window.saveDebugLog  || saveDebugLog;
  window.debugGetLog   = window.debugGetLog   || debugGetLog;
  window.debugClearLog = window.debugClearLog || debugClearLog;

  // Startmeldung
  logDebug('Debug Saver initialisiert.');
})();
