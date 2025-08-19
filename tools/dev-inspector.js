// tools/dev-inspector.js
// Dev-HUD: protokolliert fetch() + <img>.src, zeigt unten ein Overlay mit Pfaden,
// Gruppierung, Duplikaten nach Basename, sowie Export (JSON/Copy).
// Toggle: Alt + D  (oder Button)

(function(){
  if (window.__DEV_INSPECTOR__) return; // nur einmal
  const state = {
    enabled: true,
    events: [],          // {t,type,url,path,from,via,status,bytes}
    byPath: new Map(),   // path -> {count, types:Set, firstFrom, firstAt}
    start: performance.now(),
  };
  window.__DEV_INSPECTOR__ = state;

  const ORIGIN = location.origin;
  const toPath = (u) => {
    try {
      const url = new URL(u, ORIGIN);
      return url.href.startsWith(ORIGIN) ? url.pathname + url.search : url.href;
    } catch { return String(u || ''); }
  };
  const getFrom = () => {
    // Stack analysieren, erste Projekt-Zeile rauspicken
    const st = (new Error()).stack || '';
    const lines = st.split('\n').slice(2);
    for (const L of lines) {
      // typische Frames: "    at something (https://host/file.js:123:45)"
      const m = L.match(/\(?https?:\/\/[^)]+/);
      if (!m) continue;
      const url = m[0].replace('(', '');
      // Projekt-Dateien bevorzugen (unter eigener Origin)
      if (url.startsWith(ORIGIN)) return url.replace(ORIGIN,'');
    }
    return '(unbekannt)';
  };

  // UI -----------------------------------------------------------------------
  const $root = document.createElement('div');
  $root.id = 'dev-inspector';
  $root.style.cssText = `
    position: fixed; left: 0; right: 0; bottom: 0;
    font: 12px/1.4 system-ui,Segoe UI,Roboto,Arial,sans-serif;
    background: rgba(18,18,18,.92); color: #eee; z-index: 999999;
    border-top: 1px solid #333; backdrop-filter: blur(4px);
  `;
  $root.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;">
      <strong style="font-size:12px;">Dev‑Inspector</strong>
      <button id="di-toggle" style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Min</button>
      <span id="di-stats" style="opacity:.8"></span>
      <div style="margin-left:auto;display:flex;gap:6px">
        <button id="di-copy"  style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Copy Pfad‑Liste</button>
        <button id="di-json"  style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Export JSON</button>
        <button id="di-clear" style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Clear</button>
        <button id="di-hide"  style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Hide</button>
      </div>
    </div>
    <div id="di-body" style="max-height:38vh;overflow:auto;border-top:1px solid #333">
      <table style="width:100%;border-collapse:collapse">
        <thead style="position:sticky;top:0;background:#1c1c1c">
          <tr>
            <th style="text-align:left;padding:6px;border-bottom:1px solid #333">#</th>
            <th style="text-align:left;padding:6px;border-bottom:1px solid #333">Typ</th>
            <th style="text-align:left;padding:6px;border-bottom:1px solid #333">Pfad/URL</th>
            <th style="text-align:left;padding:6px;border-bottom:1px solid #333">Auslöser</th>
            <th style="text-align:left;padding:6px;border-bottom:1px solid #333">Status</th>
            <th style="text-align:right;padding:6px;border-bottom:1px solid #333">Bytes</th>
            <th style="text-align:right;padding:6px;border-bottom:1px solid #333">t+ms</th>
          </tr>
        </thead>
        <tbody id="di-rows"></tbody>
      </table>
      <div id="di-groups" style="padding:8px;border-top:1px solid #333"></div>
    </div>
  `;
  document.documentElement.appendChild($root);

  const $rows = $root.querySelector('#di-rows');
  const $stats = $root.querySelector('#di-stats');
  const $groups = $root.querySelector('#di-groups');
  const $body  = $root.querySelector('#di-body');

  const fmtBytes = (n)=> n==null ? '' :
    (n<1024? n+' B' : n<1048576? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(2)+' MB');

  function render(){
    // Tabelle (nur die letzten 400 Zeilen sichtbar halten)
    const E = state.events.slice(-400);
    $rows.innerHTML = E.map((e,i)=>`
      <tr>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a">${state.events.length - E.length + i + 1}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a;white-space:nowrap">${e.type||''}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a"><code style="font-family:ui-monospace,Consolas,monospace">${e.path||e.url}</code></td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a"><code style="font-family:ui-monospace,Consolas,monospace">${e.from||''}</code></td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a">${e.status||''}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a;text-align:right">${fmtBytes(e.bytes)}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a;text-align:right">${Math.round(e.t)}</td>
      </tr>
    `).join('');

    // Stats
    const n = state.events.length;
    const img = state.events.filter(e=>e.type==='image').length;
    const js  = state.events.filter(e=>e.type==='script' || /\.js(\?|$)/.test(e.path||'')).length;
    const json= state.events.filter(e=>e.type==='json' || /\.json(\?|$)/.test(e.path||'')).length;
    $stats.textContent = `Items: ${n} • Images: ${img} • JSON: ${json} • JS: ${js}`;

    // Gruppen/Analyse
    // 1) Duplikate nach Basename
    const baseMap = new Map();
    for (const [path, info] of state.byPath.entries()){
      const base = path.split('/').pop();
      if (!baseMap.has(base)) baseMap.set(base, []);
      baseMap.get(base).push({path, info});
    }
    const dups = [...baseMap.entries()].filter(([,arr])=>arr.length>1);
    // 2) Ordnerübersicht
    const folderMap = new Map();
    for (const [path, info] of state.byPath.entries()){
      const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      if (!folderMap.has(dir)) folderMap.set(dir, {count:0, size:0});
      folderMap.get(dir).count += info.count;
      folderMap.get(dir).size  += info.bytes||0;
    }
    const folders = [...folderMap.entries()]
      .sort((a,b)=>b[1].count - a[1].count)
      .slice(0,20)
      .map(([dir,agg])=>`<li><code>${dir||'(root)'}</code> — ${agg.count} Items, ~${fmtBytes(agg.size)}</li>`).join('');

    $groups.innerHTML = `
      <details open>
        <summary><b>Duplikate (gleicher Dateiname in unterschiedlichen Ordnern)</b> — ${dups.length}</summary>
        <ul style="margin:6px 0 0 16px">
          ${dups.map(([base,arr])=>`
            <li><code>${base}</code>
              <ul>${arr.map(x=>`<li><code>${x.path}</code> <small>(${[...x.info.types].join(', ')}, ${x.info.count}×)</small></li>`).join('')}</ul>
            </li>`).join('')}
        </ul>
      </details>
      <details>
        <summary><b>Top‑Ordner (nach Anzahl)</b></summary>
        <ul style="margin:6px 0 0 16px">${folders}</ul>
      </details>
    `;
  }

  function add(path, type, extras={}){
    if (!path) return;
    const now = performance.now() - state.start;
    const from = extras.from || getFrom();
    const status = extras.status;
    const bytes  = extras.bytes;
    const url = extras.url || path;
    const rec = { t: now, type, url, path, from, status, bytes };
    state.events.push(rec);
    const e = state.byPath.get(path) || {count:0, types:new Set(), bytes:0, firstFrom:from, firstAt:now};
    e.count++; e.types.add(type);
    if (bytes) e.bytes += (bytes|0);
    state.byPath.set(path, e);
    if (state.enabled) render();
  }

  // Exportfunktionen ----------------------------------------------------------
  function exportJSON(){
    const rows = state.events.map(e=>({
      t: Math.round(e.t),
      type: e.type, path: e.path, from: e.from, status: e.status, bytes: e.bytes||null
    }));
    const dedup = [...state.byPath.entries()].map(([path,info])=>({
      path, count: info.count, types: [...info.types], approxBytes: info.bytes||0, firstFrom: info.firstFrom, firstAt: Math.round(info.firstAt)
    }));
    const blob = new Blob([JSON.stringify({rows, byPath: dedup}, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pfadmap.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function copyList(){
    const lines = [...state.byPath.keys()].sort();
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      alert(`Kopiert: ${lines.length} Pfade`);
    } catch {
      // Fallback Download
      const blob = new Blob([lines.join('\n')], {type:'text/plain'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pfadliste.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }

  // Buttons -------------------------------------------------------------------
  $root.querySelector('#di-toggle').onclick = ()=>{
    const body = $root.querySelector('#di-body');
    const b = $root.querySelector('#di-toggle');
    const min = body.style.display !== 'none' ? true : false;
    body.style.display = min ? 'none' : 'block';
    b.textContent = min ? 'Max' : 'Min';
  };
  $root.querySelector('#di-hide').onclick = ()=> { $root.style.display='none'; state.enabled=false; };
  $root.querySelector('#di-clear').onclick = ()=> { state.events.length=0; state.byPath.clear(); render(); };
  $root.querySelector('#di-json').onclick = exportJSON;
  $root.querySelector('#di-copy').onclick = copyList;

  window.addEventListener('keydown', (ev)=>{
    if (ev.altKey && (ev.key==='d' || ev.key==='D')){
      state.enabled = true;
      $root.style.display = ($root.style.display==='none'?'block':'none');
      if ($root.style.display!=='none') render();
    }
  });

  // Hooks: fetch + <img>.src --------------------------------------------------
  const origFetch = window.fetch;
  window.fetch = async function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const path = toPath(url);
    const from = getFrom();
    let resp, status, bytes;
    try {
      resp = await origFetch.call(this, input, init);
      status = resp.status;
      const cl = resp.headers && resp.headers.get('content-length');
      bytes = cl ? parseInt(cl,10) : undefined;
      return resp;
    } finally {
      const lower = path.toLowerCase();
      const type =
        lower.endsWith('.png')||lower.endsWith('.jpg')||lower.endsWith('.jpeg')||lower.endsWith('.webp')||lower.endsWith('.gif') ? 'image' :
        lower.endsWith('.json') ? 'json' :
        lower.endsWith('.js')   ? 'script' :
        lower.endsWith('.css')  ? 'css' :
        'fetch';
      add(path, type, {from, status, bytes, url});
    }
  };

  const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    set: function(v){
      const path = toPath(v);
      const from = getFrom();
      add(path, 'image', {from, url: v});
      return imgDesc.set.call(this, v);
    },
    get: function(){ return imgDesc.get.call(this); }
  });

  // Bonus: Audio.src
  if (window.HTMLAudioElement){
    const auDesc = Object.getOwnPropertyDescriptor(HTMLAudioElement.prototype, 'src');
    if (auDesc && auDesc.set){
      Object.defineProperty(HTMLAudioElement.prototype, 'src', {
        set: function(v){
          const path = toPath(v);
          const from = getFrom();
          add(path, 'audio', {from, url: v});
          return auDesc.set.call(this, v);
        },
        get: function(){ return auDesc.get.call(this); }
      });
    }
  }

  // Erster Render
  render();

  // Öffentliche Mini-API (Debug)
  window.DevInspector = {
    version: '1.0',
    get events(){ return state.events; },
    get map(){ return state.byPath; },
    exportJSON, copyList,
    show(){ $root.style.display='block'; state.enabled=true; render(); },
    hide(){ $root.style.display='none'; state.enabled=false; },
    clear(){ state.events.length=0; state.byPath.clear(); render(); },
  };
})();
