/* ============================================================================
 * tools/dev-inspector.js
 * Dev‑Inspector v3 — integrierter Bildschirm‑Log + Filter + Export
 *
 * Features:
 *  • Minimier-/Maximierbares Diagnose-Panel unten
 *  • Live-Log mit Leveln (LOG/INFO/WARN/ERROR) – filterbar: Alle | Warnungen | Fehler
 *  • Copy & Export des *gefilterten* Logs (.txt) + optional Voll-Log (falls saveDebugLog vorhanden)
 *  • Zähler für Items (img/json/js) – API: DevInspector.img/json/js/push
 *  • Spiegelt optional den Ringpuffer aus debug.js (debugGetLog) ein, ohne Filter zu zerstören
 *
 * Einbindung:
 *   <script src="tools/dev-inspector.js"></script>
 *   (früh laden, damit console-Hooks früh aktiv sind; z. B. direkt nach debug.js)
 * ========================================================================== */

(() => {
  if (window.DevInspector) return; // Mehrfach-Init verhindern

  /* ---------- Styles ------------------------------------------------------ */
  const css = `
  #devInspector{position:fixed;left:8px;right:8px;bottom:8px;z-index:99990;
    color:#cfe3ff;font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto}
  #devInspector.min{pointer-events:none}
  #devInspector .panel{background:#0e1b2c;border:1px solid #1b2a40;border-radius:12px;
    box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden}
  #devInspector header{display:flex;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid #1b2a40}
  #devInspector header .title{font-weight:600;opacity:.9}
  #devInspector header .sp{flex:1}
  #devInspector header button{background:#0f1b29;border:1px solid #1b2a40;color:#cfe3ff;border-radius:10px;padding:5px 10px}

  #devInspector .body{display:grid;grid-template-columns:1fr;gap:10px;padding:10px}
  #devInspector .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
  #devInspector .card{background:#0b1522;border:1px solid #192537;border-radius:10px;padding:8px}
  #devInspector .muted{opacity:.7}

  #devInspector.min .panel{height:44px}
  #devInspector.min header{border-bottom:0}
  #devInspector.min .body{display:none}

  /* LOG */
  #diLog{background:#0b1320;border:1px solid #18263a;border-radius:10px;padding:8px}
  #diLog .toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px}
  #diLog .toolbar button{background:#0f1b29;border:1px solid #1b2a40;color:#cfe3ff;border-radius:10px;padding:4px 10px}
  #diLog .filter{display:flex;gap:6px;align-items:center;margin-left:auto}
  #diLog .filter button{padding:4px 8px}
  #diLog .filter .active{outline:2px solid #3d74ff}
  #diLog pre{max-height:45vh;overflow:auto;margin:0;white-space:pre-wrap}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  /* ---------- DOM --------------------------------------------------------- */
  const root = document.createElement('div'); root.id = 'devInspector'; root.className = 'min';
  root.innerHTML = `
    <div class="panel">
      <header>
        <span class="title">Dev‑Inspector</span>
        <span class="muted" id="diSummary">Items: 0 • Images: 0 • JSON: 0 • JS: 0</span>
        <span class="sp"></span>
        <button id="diToggle">Max</button>
        <button id="diCopy">Copy Pfad‑Liste</button>
        <button id="diExport">Export JSON</button>
        <button id="diClear">Clear</button>
        <button id="diHide">Hide</button>
      </header>
      <div class="body">
        <div class="grid">
          <div class="card"><div class="muted">Items</div><div id="diItems">0</div></div>
          <div class="card"><div class="muted">Images</div><div id="diImages">0</div></div>
          <div class="card"><div class="muted">JSON</div><div id="diJson">0</div></div>
          <div class="card"><div class="muted">JS</div><div id="diJs">0</div></div>
        </div>
        <div id="diLog">
          <div class="toolbar">
            <button id="diLogSave">Gefiltertes Log speichern</button>
            <button id="diLogSaveFull" title="falls debug.js vorhanden ist">Voll‑Log speichern</button>
            <button id="diLogCopy">Log kopieren</button>
            <div class="filter">
              <span class="muted">Filter:</span>
              <button id="fAll"  class="active">Alle</button>
              <button id="fWarn">Warnungen</button>
              <button id="fErr">Fehler</button>
            </div>
          </div>
          <pre id="diLogPre">(noch keine Einträge)</pre>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  /* ---------- State ------------------------------------------------------- */
  const pre = root.querySelector('#diLogPre');
  const state = {
    items: [],
    counts: { items:0, images:0, json:0, js:0 },
    lines: [],     // {ts: Date, level: 'LOG'|'INFO'|'WARN'|'ERROR', text: string}
    filter: 'ALL', // 'ALL' | 'WARN' | 'ERROR'
    seenHash: new Set(), // Duplikatvermeidung beim Import aus debug.js
  };

  function refreshCounts() {
    root.querySelector('#diItems').textContent  = state.counts.items;
    root.querySelector('#diImages').textContent = state.counts.images;
    root.querySelector('#diJson').textContent   = state.counts.json;
    root.querySelector('#diJs').textContent     = state.counts.js;
    root.querySelector('#diSummary').textContent =
      `Items: ${state.counts.items} • Images: ${state.counts.images} • JSON: ${state.counts.json} • JS: ${state.counts.js}`;
  }

  /* ---------- Items API --------------------------------------------------- */
  function push(kind, url, meta={}) {
    state.items.push({t:kind, url, meta});
    state.counts.items++;
    if (kind==='img')  state.counts.images++;
    if (kind==='json') state.counts.json++;
    if (kind==='js')   state.counts.js++;
    refreshCounts();
  }

  /* ---------- Log Capture & Filter --------------------------------------- */
  function addLine(level, ...args) {
    const text = args.map(v => {
      try {
        if (v instanceof Error) return `${v.name}: ${v.message}\n${v.stack||''}`;
        if (typeof v === 'object' && v !== null) return JSON.stringify(v, null, 2);
      } catch(_) {}
      return String(v);
    }).join(' ');

    const entry = { ts: new Date(), level, text };
    state.lines.push(entry);
    // Ringpuffer groß genug halten
    if (state.lines.length > 20000) state.lines.splice(0, 2000);
    renderLog();
  }

  function renderLog() {
    // Filter anwenden
    let lines = state.lines;
    if (state.filter === 'WARN') lines = lines.filter(l => l.level === 'WARN');
    else if (state.filter === 'ERROR') lines = lines.filter(l => l.level === 'ERROR');

    // Format: [HH:MM:SS.mmmZ] LEVEL: Text
    const fmt = (d) => d.toISOString().split('T')[1]; // nur Zeitteil
    const out = lines.slice(-4000).map(l => `[${fmt(l.ts)}] ${l.level}: ${l.text}`).join('\n');
    pre.textContent = out || '(leer)';
  }

  // console-Hooks: Originale bewahren
  const orig = { log:console.log, warn:console.warn, error:console.error, info:console.info };
  console.log  = (...a)=>{ addLine('LOG',  ...a);  orig.log(...a);  };
  console.warn = (...a)=>{ addLine('WARN', ...a);  orig.warn(...a); };
  console.error= (...a)=>{ addLine('ERROR',...a);  orig.error(...a);};
  console.info = (...a)=>{ addLine('INFO', ...a);  orig.info(...a); };

  // Optional: debug.js-Ringpuffer importieren (ohne Filter zu überschreiben)
  // Erwartetes Format pro Zeile: "[ISO] LEVEL: Text"
  function importFromDebugSaver() {
    if (typeof window.debugGetLog !== 'function') return;
    const txt = window.debugGetLog(); if (!txt) return;
    const lines = txt.split('\n');
    for (const raw of lines) {
      if (!raw) continue;
      const hash = raw; // simpel; reicht zur Duplikat-Vermeidung
      if (state.seenHash.has(hash)) continue;
      state.seenHash.add(hash);

      // Level erkennen
      let level = 'LOG';
      if (raw.includes(' ERROR:')) level = 'ERROR';
      else if (raw.includes(' WARN:')) level = 'WARN';
      else if (raw.includes(' INFO:')) level = 'INFO';

      // Zeit extrahieren (falls vorhanden)
      let ts = new Date();
      const m = raw.match(/^\[([^\]]+)\]\s+[A-Z]+:/);
      if (m) { const d = new Date(m[1]); if (!isNaN(d)) ts = d; }

      // Text nach dem ersten "LEVEL: "
      const idx = raw.indexOf(': ');
      const text = idx >= 0 ? raw.slice(idx + 2) : raw;

      state.lines.push({ ts, level, text });
      if (state.lines.length > 20000) state.lines.splice(0, 2000);
    }
    renderLog();
  }
  // Regelmäßig importieren (falls debug.js vorhanden ist)
  setInterval(importFromDebugSaver, 900);

  /* ---------- Toolbar Aktionen ------------------------------------------- */
  root.querySelector('#diToggle').onclick = () => {
    const min = root.classList.toggle('min');
    root.querySelector('#diToggle').textContent = min ? 'Max' : 'Min';
  };
  root.querySelector('#diCopy').onclick = () => {
    const txt = state.items.map(it=>`${it.t}\t${it.url}`).join('\n');
    navigator.clipboard?.writeText(txt).catch(()=>{});
  };
  root.querySelector('#diExport').onclick = () => {
    const payload = { items:state.items, counts:state.counts, log:state.lines };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dev-inspector.json';
    a.click(); URL.revokeObjectURL(a.href);
  };
  root.querySelector('#diClear').onclick = () => {
    state.items.length = 0;
    state.counts = { items:0, images:0, json:0, js:0 };
    refreshCounts();
  };
  root.querySelector('#diHide').onclick = () => { root.style.display = 'none'; };

  // Log: speichern (gefiltert)
  root.querySelector('#diLogSave').onclick = () => {
    // Nimm den aktuell sichtbaren Text (mit Filter)
    const txt = pre.textContent || '';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], {type:'text/plain'}));
    a.download = 'siedler-mini-debug-filtered.txt';
    a.click(); URL.revokeObjectURL(a.href);
  };
  // Log: Voll-Log (falls saveDebugLog vorhanden)
  root.querySelector('#diLogSaveFull').onclick = () => {
    if (typeof window.saveDebugLog === 'function') { window.saveDebugLog(); return; }
    // Fallback: ungefiltertes aus internem Speicher
    const fmt = (d) => d.toISOString();
    const all = state.lines.map(l => `[${fmt(l.ts)}] ${l.level}: ${l.text}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([all], {type:'text/plain'}));
    a.download = 'siedler-mini-debug-full.txt';
    a.click(); URL.revokeObjectURL(a.href);
  };
  root.querySelector('#diLogCopy').onclick = () => {
    const txt = pre.textContent || '';
    navigator.clipboard?.writeText(txt).catch(()=>{});
  };

  // Filter-Buttons
  const fAll  = root.querySelector('#fAll');
  const fWarn = root.querySelector('#fWarn');
  const fErr  = root.querySelector('#fErr');
  function setFilter(mode) {
    state.filter = mode; // 'ALL' | 'WARN' | 'ERROR'
    fAll.classList.toggle('active',  mode==='ALL');
    fWarn.classList.toggle('active', mode==='WARN');
    fErr.classList.toggle('active',  mode==='ERROR');
    renderLog();
  }
  fAll .onclick = () => setFilter('ALL');
  fWarn.onclick = () => setFilter('WARN');
  fErr .onclick = () => setFilter('ERROR');

  /* ---------- Expose API -------------------------------------------------- */
  window.DevInspector = {
    // Item-API
    push, json:(u)=>push('json',u), img:(u)=>push('img',u), js:(u)=>push('js',u),
    // Log-API
    log: (...a)=>addLine('LOG',  ...a),
    info:(...a)=>addLine('INFO', ...a),
    warn:(...a)=>addLine('WARN', ...a),
    error:(...a)=>addLine('ERROR',...a),
    // UI
    setMinimized:(b)=>{ root.classList.toggle('min', !!b); root.querySelector('#diToggle').textContent = b ? 'Max' : 'Min'; }
  };

  // Startzustand: minimiert + „Alle“
  window.DevInspector.setMinimized(true);
  setFilter('ALL');

  // Erste Summary anzeigen
  refreshCounts();
})();
