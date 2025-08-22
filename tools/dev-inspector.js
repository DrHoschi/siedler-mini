/* ============================================================================
 * Dev‑Inspector v2 — integrierter Bildschirm‑Log + Asset‑Zähler
 * Datei: tools/dev-inspector.js
 * Zweck:
 *   • Minimierbares/Maximierbares Diagnose-Panel unten
 *   • Aggregiert console.log/.warn/.error/.info in einem Logfenster
 *   • Kann optional den Ringpuffer aus debug.js (debugGetLog) anzeigen
 *   • Export/Copy/Save des Logs + einfache Item-Zähler (Images/JSON/JS)
 *
 * Einbindung:
 *   <script src="tools/dev-inspector.js"></script>
 *   (am besten VOR boot/game geladen, damit console-Hooks früh aktiv sind)
 *
 * Public API:
 *   window.DevInspector.push(kind,url,meta?)   // "img" | "json" | "js"
 *   window.DevInspector.log(text)              // Textzeile anhängen
 *   window.DevInspector.setMinimized(bool)     // Min/Max umschalten
 *
 * Buttons im Panel:
 *   • Max/Min – Panel auf/zu
 *   • Copy Pfad‑Liste – alle erfassten Items in die Zwischenablage
 *   • Export JSON – Items + Counts + Log als JSON herunterladen
 *   • Clear – Zähler/Items zurücksetzen (Log bleibt)
 *   • Hide – Panel ausblenden
 *   • Debug speichern – nutzt saveDebugLog() falls vorhanden, sonst Fallback
 *   • Log kopieren – reinen Textlog kopieren
 * ========================================================================== */

(() => {
  if (window.DevInspector) return; // Mehrfach-Init verhindern

  // ---------- Styles --------------------------------------------------------
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

  /* LOG-Bereich */
  #diLog{background:#0b1320;border:1px solid #18263a;border-radius:10px;padding:8px}
  #diLog pre{max-height:45vh;overflow:auto;margin:0;white-space:pre-wrap}
  #diLog .toolbar{display:flex;gap:8px;margin-bottom:6px}
  #diLog .toolbar button{background:#0f1b29;border:1px solid #1b2a40;color:#cfe3ff;border-radius:10px;padding:4px 10px}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // ---------- DOM -----------------------------------------------------------
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
            <button id="diLogSave">Debug speichern</button>
            <button id="diLogCopy">Log kopieren</button>
            <span class="muted">Bildschirm‑Log</span>
          </div>
          <pre id="diLogPre">(noch keine Einträge)</pre>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ---------- State + Helper -----------------------------------------------
  const state = {items:[], counts:{items:0, images:0, json:0, js:0}, lines:[]};
  const pre = root.querySelector('#diLogPre');

  function refresh() {
    root.querySelector('#diItems').textContent  = state.counts.items;
    root.querySelector('#diImages').textContent = state.counts.images;
    root.querySelector('#diJson').textContent   = state.counts.json;
    root.querySelector('#diJs').textContent     = state.counts.js;
    root.querySelector('#diSummary').textContent =
      `Items: ${state.counts.items} • Images: ${state.counts.images} • JSON: ${state.counts.json} • JS: ${state.counts.js}`;
  }

  function push(kind, url, meta={}) {
    state.items.push({t:kind, url, meta});
    state.counts.items++;
    if (kind==='img')  state.counts.images++;
    if (kind==='json') state.counts.json++;
    if (kind==='js')   state.counts.js++;
    refresh();
  }

  function logLine(text) {
    const s = `[${new Date().toISOString()}] ${text}`;
    state.lines.push(s);
    if (state.lines.length>5000) state.lines.shift();     // Ringpuffer
    pre.textContent = state.lines.slice(-1200).join('\n'); // letzte n Zeilen
  }

  // ---------- Buttons -------------------------------------------------------
  root.querySelector('#diToggle').onclick = () => {
    const min = root.classList.toggle('min');
    root.querySelector('#diToggle').textContent = min ? 'Max' : 'Min';
  };
  root.querySelector('#diCopy').onclick = () => {
    const txt = state.items.map(it=>`${it.t}\t${it.url}`).join('\n');
    navigator.clipboard?.writeText(txt).catch(()=>{});
  };
  root.querySelector('#diExport').onclick = () => {
    const blob = new Blob([JSON.stringify({items:state.items, counts:state.counts, log:state.lines},null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dev-inspector.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  root.querySelector('#diClear').onclick = () => { state.items.length=0; state.counts={items:0,images:0,json:0,js:0}; refresh(); };
  root.querySelector('#diHide').onclick  = () => { root.style.display='none'; };
  root.querySelector('#diLogCopy').onclick = () => {
    const txt = pre.textContent || state.lines.join('\n'); navigator.clipboard?.writeText(txt).catch(()=>{});
  };
  root.querySelector('#diLogSave').onclick = () => {
    // Bevorzugt die zentrale saveDebugLog() aus debug.js
    if (typeof window.saveDebugLog === 'function') { window.saveDebugLog(); return; }
    // Fallback – speichere Inspector-Log
    const blob = new Blob([state.lines.join('\n')],{type:'text/plain'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='siedler-mini-debug.txt'; a.click(); URL.revokeObjectURL(a.href);
  };

  // ---------- console‑Hook + debug.js‑Integration ---------------------------
  const orig = {log:console.log, warn:console.warn, error:console.error, info:console.info};
  console.log  = (...a)=>{ logLine('LOG:  '+a.map(String).join(' '));  orig.log(...a);  };
  console.warn = (...a)=>{ logLine('WARN: '+a.map(String).join(' '));  orig.warn(...a); };
  console.error= (...a)=>{ logLine('ERROR:'+a.map(String).join(' '));  orig.error(...a);};
  console.info = (...a)=>{ logLine('INFO: '+a.map(String).join(' '));  orig.info(...a); };

  // Wenn debug.js vorhanden, seinen Puffer regelmäßig spiegeln
  if (typeof window.debugGetLog === 'function') {
    setInterval(() => {
      const txt = window.debugGetLog();
      if (txt) pre.textContent = txt.split('\n').slice(-1200).join('\n');
    }, 800);
  }

  // ---------- Expose --------------------------------------------------------
  window.DevInspector = {
    push, log: logLine,
    note: (t)=>logLine(t),
    json: (url)=>push('json', url),
    img:  (url)=>push('img',  url),
    js:   (url)=>push('js',   url),
    setMinimized:(b)=>{ root.classList.toggle('min', !!b); root.querySelector('#diToggle').textContent = b ? 'Max' : 'Min'; }
  };

  // Start minimiert
  window.DevInspector.setMinimized(true);
})();
