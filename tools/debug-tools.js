// tools/debug-tools.js
// DebugTools v2 — Bottom Dock (Min/Max) + Tabbed Window (Konsole | Assets | Scan)
// Toggle: Alt+D  |  Tabs: Alt+1/2/3  |  Persistenz in localStorage
// Features: Expected vs. Loaded (✅/❌/⚠️), Alias-Vorschläge, Scan Sources, Map-Scan, Exporte

(function(){
  const ORIGIN = location.origin;
  const LS_KEY = 'dt.v2.state';
  const state = loadState() || { minimized:true, activeTab:'assets' };

  // ---------- Utils ----------
  const toPath = (u)=>{ try{ const url=new URL(u,ORIGIN); return url.href.startsWith(ORIGIN)? (url.pathname+(url.search||'')) : url.href; }catch{ return String(u||''); } };
  const normalize = (p)=>{
    if(!p) return ''; if(/^https?:\/\//i.test(p)){ try{ const u=new URL(p); return u.pathname+(u.search||''); }catch{ return p; } }
    const a=document.createElement('a'); a.href=p; return a.pathname+(a.search||'');
  };
  const fmtBytes = (n)=> n==null ? '' : (n<1024? n+' B' : n<1048576? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(2)+' MB');
  const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));
  const download = (blob, name)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); };
  const escapeHtml = (s)=> String(s).replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function saveState(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch{} }
  function loadState(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||''); }catch{ return null; } }
  function badge(html, color){ return `<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 6px;border-radius:999px;border:1px solid ${color};color:${color};font-size:11px">${html}</span>`; }
  const ICON_OK='✅', ICON_FAIL='❌', ICON_WARN='⚠️';

  // ---------- Root/Public ----------
  const DT = window.DebugTools = window.DebugTools || {};
  DT.version = '2.0';

  // ---------- Console ----------
  const Console = DT.Console = DT.Console || {};
  const CON = Console.__state = Console.__state || { lines:[], body:null, maxLines:700 };
  function initConsoleHook(){
    if (Console.__hooked) return;
    Console.__hooked = true;
    ['log','warn','error'].forEach(type=>{
      const orig = console[type].bind(console);
      console[type] = (...args)=>{
        try{ orig(...args); }catch{}
        try{
          const ts = new Date().toLocaleTimeString();
          const msg = args.map(x=> typeof x==='string'? x : (x && x.message) || JSON.stringify(x)).join(' ');
          CON.lines.push({type, ts, msg});
          if (CON.lines.length>CON.maxLines) CON.lines.splice(0, CON.lines.length-CON.maxLines);
          renderConsole();
        }catch{}
      };
    });
    window.addEventListener('error', e => console.error('Fehler:', e.message, 'bei', e.filename, 'Zeile', e.lineno));
    window.addEventListener('unhandledrejection', e => console.error('Unhandled Promise Rejection:', e.reason));
  }
  function renderConsole(){
    if (!CON.body) return;
    const color = (t)=> t==='error'?'#ff6b6b' : t==='warn'?'#ffd166' : '#d3e1ff';
    CON.body.innerHTML = CON.lines.map(l=>`<div style="color:${color(l.type)};white-space:pre-wrap">[${l.ts}] [${l.type}] ${escapeHtml(l.msg)}</div>`).join('');
    CON.body.scrollTop = CON.body.scrollHeight;
    updateBadges();
  }

  // ---------- Assets ----------
  const Assets = DT.Assets = DT.Assets || {};
  const A = Assets.__state = Assets.__state || {
    expected: new Set(),
    aliases: new Map(),
    canonicalRoots: ['/assets/','/maps/','/core/','/tools/','/ui/','/textures/','/img/'],
    loaded: [],
    byPath: new Map(),
    failures: new Map(),
    start: performance.now(),
    table:null, issues:null, stats:null
  };
  function guessType(path){
    const s = path.toLowerCase();
    return s.endsWith('.png')||s.endsWith('.jpg')||s.endsWith('.jpeg')||s.endsWith('.webp')||s.endsWith('.gif') ? 'image' :
           s.endsWith('.json') ? 'json' :
           s.endsWith('.js')   ? 'script' :
           s.endsWith('.css')  ? 'css' :
           s.endsWith('.mp3')||s.endsWith('.ogg')||s.endsWith('.wav') ? 'audio' :
           s.endsWith('.ttf')||s.endsWith('.otf')||s.endsWith('.woff')||s.endsWith('.woff2') ? 'font' :
           'fetch';
  }
  Assets.expect = function(listOrText){
    if (Array.isArray(listOrText)) listOrText.forEach(p=>A.expected.add(normalize(p)));
    else if (typeof listOrText==='string') listOrText.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(p=>A.expected.add(normalize(p)));
    renderAssets();
  };
  Assets.expectFromJSON = async function(src){
    try{
      if (typeof src==='string'){ const r=await fetch(src); const j=await r.json(); const arr = Array.isArray(j)? j : (j.paths||j.expected||[]); Assets.expect(arr); }
      else if (src && (Array.isArray(src.paths)||Array.isArray(src.expected))) Assets.expect(src.paths||src.expected);
    }catch(e){ console.warn('expectFromJSON',e); }
  };
  Assets.addAlias = (alias, canonical)=> A.aliases.set(normalize(alias), normalize(canonical));
  Assets.setCanonicalRoots = arr => A.canonicalRoots = [...arr];
  Assets.markLoaded = function(path, type, extras={}){
    const p = normalize(path); if(!p) return;
    const rec = { t: Math.round(performance.now()-A.start), type: type||guessType(p), path: p, status: extras.status, bytes: extras.bytes };
    A.loaded.push(rec);
    const info = A.byPath.get(p) || {count:0, types:new Set(), bytes:0, status:null};
    info.count++; info.types.add(rec.type);
    if(rec.bytes) info.bytes+=(rec.bytes|0);
    if(rec.status) info.status=rec.status;
    A.byPath.set(p, info);
    renderAssets();
  };
  Assets.checkExists = async function(paths, {concurrency=8, method='HEAD'}={}){
    const list = paths ? paths.map(normalize) : [...A.expected];
    const queue = list.slice();
    async function worker(){ while(queue.length){ const p=queue.shift(); try{ const r=await fetch(p,{method}); if(!r.ok) A.failures.set(p,{status:r.status}); }catch{ A.failures.set(p,{status:'ERR'}); } await sleep(0);} }
    await Promise.all(new Array(concurrency).fill(0).map(worker));
    renderAssets(); return A.failures;
  };
  function canonicalize(p){
    const n = normalize(p);
    if (A.aliases.has(n)) return A.aliases.get(n);
    if (A.canonicalRoots.length){
      const base = n.split('/').pop();
      for (const root of A.canonicalRoots){
        const cand = (root.endsWith('/')? root+base : root+'/'+base);
        if (A.byPath.has(cand) || A.expected.has(cand)) return cand;
      }
    }
    return n;
  }
  Assets.report = function(){
    const loadedPaths = new Set(A.loaded.map(e=>e.path));
    const normalizedExpected = new Set([...A.expected].map(canonicalize));
    const missing = [...normalizedExpected].filter(p=> !loadedPaths.has(p) && !A.failures.has(p));

    const baseMap = new Map();
    const allPaths = new Set([...normalizedExpected, ...loadedPaths]);
    for (const p of allPaths){ const b=p.split('/').pop(); if(!baseMap.has(b)) baseMap.set(b,[]); baseMap.get(b).push(p); }
    const duplicates = [...baseMap.entries()].filter(([,arr])=>arr.length>1);

    const wrongPath = [];
    for (const e of A.loaded){ const canon=canonicalize(e.path); if (canon!==e.path) wrongPath.push({loaded:e.path, canonical:canon}); }

    return {
      missing,
      failures: [...A.failures.entries()].map(([path,info])=>({path,...info})),
      duplicates,
      wrongPath,
      counts: {
        loaded: A.loaded.length,
        images: A.loaded.filter(e=>e.type==='image').length,
        json:   A.loaded.filter(e=>e.type==='json').length,
        js:     A.loaded.filter(e=>e.type==='script').length,
        expected: A.expected.size
      },
      byPath: [...A.byPath.entries()].map(([path,info])=>({path,count:info.count,types:[...info.types],bytes:info.bytes||0,status:info.status||null}))
    };
  };

  // fetch/img/audio hooken → Loaded-Liste
  if (!Assets.__hooks){
    Assets.__hooks = true;
    const origFetch = window.fetch;
    window.fetch = async function(input, init){
      const url = typeof input==='string' ? input : (input && input.url) || '';
      const path = toPath(url);
      let resp, status, bytes;
      try{
        resp = await origFetch.call(this, input, init);
        status = resp.status;
        const cl = resp.headers && resp.headers.get('content-length'); bytes = cl ? parseInt(cl,10) : undefined;
        return resp;
      } finally { Assets.markLoaded(path, guessType(path), {status, bytes}); }
    };
    const imgD = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
    Object.defineProperty(HTMLImageElement.prototype,'src',{ set(v){ Assets.markLoaded(toPath(v),'image',{}); return imgD.set.call(this,v); }, get(){ return imgD.get.call(this); }});
    if (window.HTMLAudioElement){
      const auD = Object.getOwnPropertyDescriptor(HTMLAudioElement.prototype,'src');
      if (auD && auD.set){
        Object.defineProperty(HTMLAudioElement.prototype,'src',{ set(v){ Assets.markLoaded(toPath(v),'audio',{}); return auD.set.call(this,v); }, get(){ return auD.get.call(this); }});
      }
    }
  }

  // ---------- Scan (Regex) ----------
  const Scan = DT.Scan = DT.Scan || {};
  const SC = Scan.__state = Scan.__state || { input:null };

  Scan.scanList = async function(list){
    const files = (list||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if (!files.length) return alert('Bitte Datei‑URLs eintragen (eine pro Zeile).');

    const found = new Set();
    const exts = '\\.(png|jpg|jpeg|webp|gif|json|js|css|mp3|ogg|wav|ttf|otf|woff2?|svg)\\b';
    const RE_GENERIC = new RegExp('["\\\']'+'([^"\\\']*'+exts+'(?:\\?[^"\\\']*)?)'+'["\\\']','ig');
    const RE_FETCH  = /fetch\s*\(\s*["'`]([^"'`]+)["'`]/ig;
    const RE_IMPORT = /import\s*\(\s*["'`]([^"'`]+)["'`]/ig;
    const RE_IMG    = /(?:new\s+Image\(\)|<img\b[^>]*?)\s(?:src|SRC)\s*=\s*["'`]([^"'`]+)["'`]/ig;
    const RE_LINK   = /<link\b[^>]*?href\s*=\s*["'`]([^"'`]+)["'`]/ig;
    const RE_SCRIPT = /<script\b[^>]*?src\s*=\s*["'`]([^"'`]+)["'`]/ig;
    const RE_STYLE  = /url$begin:math:text$\\s*["']?([^"')]+)["']?\\s*$end:math:text$/ig;

    async function processOne(path){
      try{
        const r = await fetch(path, {cache:'no-cache'}); if (!r.ok) return;
        const txt = await r.text();
        function pushAll(re){
          re.lastIndex=0; let m;
          while((m=re.exec(txt))){
            const raw=m[1]; if(!raw) continue;
            let resolved;
            try{ const base=new URL(path,ORIGIN); const u=new URL(raw,base); if(u.href.startsWith(ORIGIN)) resolved=u.pathname+(u.search||''); else return; }
            catch{ resolved=raw; }
            const norm=normalize(resolved); if(norm) found.add(norm);
          }
        }
        [RE_GENERIC,RE_FETCH,RE_IMPORT,RE_IMG,RE_LINK,RE_SCRIPT,RE_STYLE].forEach(pushAll);
      }catch(e){ console.warn('Scan error for',path,e); }
    }
    for (const f of files){ await processOne(normalize(f)); await sleep(0); }

    const arr=[...found];
    if (!arr.length) return alert('Scan: keine Pfade gefunden.');
    Assets.expect(arr);
    await Assets.checkExists(arr);
    alert(`Scan: ${arr.length} Pfade gefunden und als Expected übernommen.`);
  };

  Scan.loadManifest = async function(url){
    if (!url) return alert('Manifest‑URL fehlt.');
    try{
      const r = await fetch(url); if(!r.ok) throw new Error(r.status);
      const j = await r.json();
      const arr = Array.isArray(j)? j : (j.paths||j.expected||[]);
      if (!arr || !arr.length) return alert('Manifest leer oder unerwartetes Format.');
      Assets.expect(arr);
      await Assets.checkExists(arr);
      alert(`Manifest: ${arr.length} Pfade übernommen.`);
    }catch(e){ alert('Manifest konnte nicht geladen werden: '+e); }
  };

  // ---------- Map-Scan ----------
  Scan.scanMaps = async function(mapListStr, baseDirsStr){
    const mapUrls = (mapListStr||'').split(/[, \n\r]+/).map(s=>s.trim()).filter(Boolean);
    if (!mapUrls.length) return alert('Bitte Map-Dateien angeben (z. B. /maps/start-map.json).');

    const baseDirs = (baseDirsStr||'').split(/[, \n\r]+/).map(s=>s.trim()).filter(Boolean);
    const bases = baseDirs.length ? baseDirs : ['/assets/tiles/','/assets/terrain/','/assets/tex/','/textures/','/img/'];

    const expected = new Set();
    const asPath = (dir, file)=>{ if (!dir.endsWith('/')) dir+='/'; return normalize(dir + file); };
    const pushName = (name) => {
      if (!name) return;
      if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(name)) {
        for (const b of bases) expected.add(asPath(b, name));
      } else {
        for (const b of bases) {
          expected.add(asPath(b, name + '.png'));
          expected.add(asPath(b, name + '.webp'));
        }
      }
    };

    for (const url of mapUrls){
      try{
        const r = await fetch(url, {cache:'no-cache'});
        if (!r.ok) { console.warn('Map fetch fail', url, r.status); continue; }
        const map = await r.json();

        if (Array.isArray(map.tiles)) { for (const t of map.tiles) pushName(t && (t.name || t.file || t.src)); }
        if (map.legend && typeof map.legend==='object'){ const names=new Set(Object.values(map.legend).map(String)); for (const n of names) pushName(n); }
        if (map.tileset && typeof map.tileset==='string'){
          try{
            const base = new URL(url, location.origin);
            const tsURL = new URL(map.tileset, base).pathname + (new URL(map.tileset, base).search||'');
            const tr = await fetch(tsURL, {cache:'no-cache'});
            if (tr.ok){
              const ts = await tr.json();
              if (Array.isArray(ts.images)) ts.images.forEach(n => pushName(n));
              if (Array.isArray(ts.tiles))  ts.tiles.forEach(t => pushName(t && (t.name||t.file||t.src)));
              if (ts.legend && typeof ts.legend==='object'){ const nms=new Set(Object.values(ts.legend).map(String)); for (const n of nms) pushName(n); }
            }
          }catch(e){ console.warn('tileset fetch', e); }
        }
      }catch(e){ console.warn('Map parse', url, e); }
    }

    const arr = [...expected];
    if (!arr.length) return alert('Map-Scan: keine Bildnamen gefunden.');
    DebugTools.Assets.expect(arr);
    await DebugTools.Assets.checkExists(arr);
    alert(`Map-Scan: ${arr.length} erwartete Pfade übernommen.`);
  };

  // ---------- UI ----------
  let bar=null, win=null;
  const ICONS = {
    console:`<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3 4h2v2H7V9zm0 3h5v2H7v-2z"/></svg>`,
    assets:`<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 7l9-4 9 4v10l-9 4-9-4V7zm9-2.3L5 8l7 3 7-3-7-3.3zM5 10.5l7 3 7-3V16l-7 3-7-3v-5.5z"/></svg>`,
    scan:`<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10 2a8 8 0 0 1 6.32 12.9l4.39 4.39-1.41 1.41-4.39-4.39A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"/></svg>`,
    copy:`<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14h13a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>`,
    json:`<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M5 3h14v4H5V3zm0 6h14v12H5V9zm2 2v8h10v-8H7z"/></svg>`,
    csv:`<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M3 5h18v14H3V5zm4 3h2v8H7V8zm4 0h2v8h-2V8zm4 0h2v8h-2V8z"/></svg>`,
    head:`<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2l4 7H8l4-7zm0 20l-4-7h8l-4 7zM2 12l7-4v8l-7-4zm20 0l-7 4V8l7 4z"/></svg>`,
    maximize:`<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M4 4h7v2H6v5H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"/></svg>`,
    minimize:`<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M4 11h16v2H4z"/></svg>`
  };

  function ensureUI(){
    if (bar && win) return;
    const style = document.createElement('style');
    style.textContent = `
      #dt-bar { position:fixed; left:10px; right:10px; bottom:10px; display:flex; align-items:center; gap:8px;
        background:#0d1117ee; color:#d1e2ff; border:1px solid #25324a; border-radius:10px; padding:6px 10px; z-index:2147483646;
        box-shadow:0 10px 40px rgba(0,0,0,.35); backdrop-filter:blur(4px); font:12px ui-monospace; }
      #dt-bar .tab { display:flex; align-items:center; gap:6px; padding:3px 8px; border:1px solid #25324a; border-radius:8px; cursor:pointer; background:#141b27; }
      #dt-bar .tab.active { background:#1d2636; }
      #dt-bar .badge { background:#2a3a57; color:#cfe3ff; border-radius:10px; padding:0 6px; font-size:11px; }
      #dt-bar .spacer { flex:1 1 auto; }
      #dt-bar .btn { display:inline-flex; align-items:center; gap:6px; padding:3px 8px; background:#141b27; border:1px solid #25324a; border-radius:8px; cursor:pointer; }

      #dt-win { position:fixed; left:10px; right:10px; bottom:10px; max-height:60vh; background:#0b0f16f2; color:#e8eefc; border:1px solid #25324a; border-radius:12px;
        z-index:2147483647; box-shadow:0 16px 60px rgba(0,0,0,.5); display:none; font:12px/1.45 system-ui,Segoe UI,Roboto,Arial,sans-serif; }
      #dt-head { display:flex; align-items:center; gap:8px; border-bottom:1px solid #21334d; padding:8px 10px; background:#0f1521; }
      #dt-head .tab { display:flex; align-items:center; gap:6px; padding:6px 10px; border-radius:8px; cursor:pointer; color:#cfe3ff; }
      #dt-head .tab.active { background:#1a2537; }
      #dt-body { padding:8px 10px; overflow:auto; max-height:calc(60vh - 42px); }
      .dt-panel { display:none; } .dt-panel.active { display:block; }

      .dt-cons { background:#0c1320; border:1px solid #21334d; border-radius:10px; padding:8px; max-height:calc(60vh - 120px); overflow:auto; font:12px ui-monospace; }

      table.dt { width:100%; border-collapse:collapse; }
      table.dt th, table.dt td { border-bottom:1px solid #21334d; padding:6px; font-size:12px; }
      table.dt thead th { position:sticky; top:0; background:#0f1521; }
      code.mono { font-family:ui-monospace,Consolas,monospace; }

      .dt-input { background:#0f1b29; color:#d1e2ff; border:1px solid #21334d; border-radius:8px; padding:6px; }
      .dt-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; background:#141b27; border:1px solid #25324a; color:#cfe3ff; border-radius:8px; cursor:pointer; }
      .dt-btn:disabled { opacity:.5; cursor:default; }
      .dt-actions { display:flex; gap:6px; flex-wrap:wrap; }
    `;
    document.head.appendChild(style);

    bar = document.createElement('div');
    bar.id = 'dt-bar';
    bar.innerHTML = `
      <div class="tab" data-tab="console">${ICONS.console}<span>Konsole</span></div>
      <div class="tab" data-tab="assets">${ICONS.assets}<span>Assets</span><span class="badge" id="dt-badge-missing">0</span></div>
      <div class="tab" data-tab="scan">${ICONS.scan}<span>Scan</span></div>
      <div class="spacer"></div>
      <div class="btn" id="dt-toggle">${state.minimized?ICONS.maximize:ICONS.minimize}<span>${state.minimized?'Max':'Min'}</span></div>
    `;
    document.body.appendChild(bar);

    win = document.createElement('div');
    win.id = 'dt-win';
    win.innerHTML = `
      <div id="dt-head">
        <div class="tab" data-tab="console">${ICONS.console}<span>Konsole</span></div>
        <div class="tab" data-tab="assets">${ICONS.assets}<span>Assets</span></div>
        <div class="tab" data-tab="scan">${ICONS.scan}<span>Scan</span></div>
        <div class="spacer"></div>
        <button class="dt-btn" id="dt-hide">${ICONS.minimize}<span>Min</span></button>
      </div>
      <div id="dt-body">
        <div id="dt-panel-console" class="dt-panel">
          <div class="dt-actions" style="margin-bottom:8px">
            <button class="dt-btn" id="dt-cons-clear">🧹<span>Clear</span></button>
            <button class="dt-btn" id="dt-cons-copy">${ICONS.copy}<span>Copy</span></button>
          </div>
          <div class="dt-cons" id="dt-cons-body"></div>
        </div>
        <div id="dt-panel-assets" class="dt-panel">
          <div class="dt-actions" style="margin-bottom:8px">
            <button class="dt-btn" id="dt-assets-copy">${ICONS.copy}<span>Copy Pfade</span></button>
            <button class="dt-btn" id="dt-assets-json">${ICONS.json}<span>Export JSON</span></button>
            <button class="dt-btn" id="dt-assets-csv">${ICONS.csv}<span>Export CSV</span></button>
            <button class="dt-btn" id="dt-assets-head">${ICONS.head}<span>Existenz (HEAD)</span></button>
            <button class="dt-btn" id="dt-assets-clear">🧹<span>Clear</span></button>
          </div>
          <div id="dt-assets-stats" style="opacity:.9;margin-bottom:6px"></div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:8px">
            <textarea id="dt-expected" class="dt-input" placeholder="Erwartete Pfade (ein Pfad pro Zeile) …" style="flex:1 1 360px; min-height:72px"></textarea>
            <div class="dt-actions" style="align-items:flex-start">
              <button class="dt-btn" id="dt-expected-add">${ICONS.json}<span>Zu Expected</span></button>
            </div>
          </div>
          <table class="dt"><thead><tr>
            <th>#</th><th>Typ</th><th>Pfad</th><th>Status</th><th style="text-align:right">Bytes</th><th style="text-align:right">t+ms</th>
          </tr></thead><tbody id="dt-assets-rows"></tbody></table>
          <div id="dt-assets-issues" style="padding:8px 0"></div>
        </div>
        <div id="dt-panel-scan" class="dt-panel">
          <div class="dt-actions" style="margin-bottom:8px">
            <input id="dt-manifest-url" class="dt-input" placeholder="/assets/manifest.json (optional)" style="min-width:260px">
            <button class="dt-btn" id="dt-manifest-load">${ICONS.json}<span>Manifest laden</span></button>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:8px">
            <textarea id="dt-scan-list" class="dt-input" placeholder="Zu scannende Dateien (eine pro Zeile) …" style="flex:1 1 360px; min-height:120px"></textarea>
            <div class="dt-actions" style="align-items:flex-start">
              <button class="dt-btn" id="dt-scan-run">${ICONS.scan}<span>Scan Sources</span></button>
            </div>
          </div>
          <!-- Map-Scanner -->
          <div class="dt-actions" style="margin:10px 0 6px">
            <input id="dt-map-list" class="dt-input" placeholder="/maps/start-map.json, /maps/map-pro.json …" style="min-width:360px">
            <input id="dt-map-basedirs" class="dt-input" placeholder="Tile-Basisordner (Komma): /assets/tiles/, /assets/terrain/" style="min-width:360px">
            <button class="dt-btn" id="dt-scan-maps"><span>🗺️ Scan Maps</span></button>
          </div>
          <div style="opacity:.8; margin-bottom:6px">
            • Für <code>tiles: [{name:"grass.png"}]</code> werden die Namen mit den Basisordnern kombiniert.<br>
            • Für <code>legend</code>-Einträge (z. B. <code>grass</code>) wird <code>${'{name}'}.png</code> (und <code>.webp</code>) probiert.
          </div>
          <div style="opacity:.8">Tipp: In die Liste gehören z. B. <code>/index.html</code>, <code>/boot.js</code>, <code>/game.js</code>, <code>/tools/map-runtime.js</code>, <code>/core/assets.js</code>, <code>/core/terrain.js</code>, <code>/core/camera.js</code>, <code>/core/carriers.js</code> …</div>
        </div>
      </div>
    `;
    document.body.appendChild(win);

    // Bar-Events
    bar.addEventListener('click', (e)=>{
      const t = e.target.closest('.tab'); if (t){ setActiveTab(t.dataset.tab); showWindow(); }
      const tog = e.target.closest('#dt-toggle'); if (tog){ state.minimized? showWindow() : hideWindow(); }
    });

    // Head-Tabs
    win.querySelectorAll('#dt-head .tab').forEach(btn=> btn.addEventListener('click', ()=> setActiveTab(btn.dataset.tab)));
    win.querySelector('#dt-hide').addEventListener('click', hideWindow);

    // Console actions
    CON.body  = win.querySelector('#dt-cons-body');
    win.querySelector('#dt-cons-clear').onclick = ()=>{ CON.lines.length=0; renderConsole(); };
    win.querySelector('#dt-cons-copy').onclick  = async ()=>{
      const text = CON.lines.map(l=>`[${l.ts}] [${l.type}] ${l.msg}`).join('\n');
      try{ await navigator.clipboard.writeText(text); alert('Konsole kopiert.'); }catch{ download(new Blob([text],{type:'text/plain'}),'console.log.txt'); }
    };

    // Assets actions
    A.table = win.querySelector('#dt-assets-rows');
    A.issues= win.querySelector('#dt-assets-issues');
    A.stats = win.querySelector('#dt-assets-stats');
    const expTA = win.querySelector('#dt-expected');
    win.querySelector('#dt-assets-copy').onclick = async ()=>{
      const lines = [...A.byPath.keys()].sort();
      try{ await navigator.clipboard.writeText(lines.join('\n')); alert(`Kopiert: ${lines.length} Pfade`);}catch{ download(new Blob([lines.join('\n')],{type:'text/plain'}),'pfade.txt');}
    };
    win.querySelector('#dt-assets-json').onclick = ()=>{
      const r = Assets.report(); download(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}),'assets-report.json');
    };
    win.querySelector('#dt-assets-csv').onclick = ()=>{
      const r=Assets.report(); const rows=[['type','path','extra']];
      r.missing.forEach(p=>rows.push(['missing',p,'']));
      r.failures.forEach(f=>rows.push(['failure',f.path,f.status]));
      r.wrongPath.forEach(w=>rows.push(['wrongPath',w.loaded,w.canonical]));
      r.duplicates.forEach(([b,arr])=>arr.forEach(p=>rows.push(['duplicate('+b+')',p,''])));
      const csv=rows.map(cols=>cols.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
      download(new Blob([csv],{type:'text/csv'}),'assets-report.csv');
    };
    win.querySelector('#dt-assets-head').onclick  = ()=> Assets.checkExists();
    win.querySelector('#dt-assets-clear').onclick = ()=>{ A.loaded.length=0; A.byPath.clear(); A.failures.clear(); renderAssets(); };
    win.querySelector('#dt-expected-add').onclick = ()=>{ Assets.expect(expTA.value); expTA.value=''; };

    // Scan actions
    SC.input = win.querySelector('#dt-scan-list');
    const manifestInput = win.querySelector('#dt-manifest-url');
    win.querySelector('#dt-manifest-load').onclick = ()=> Scan.loadManifest(manifestInput.value.trim());
    win.querySelector('#dt-scan-run').onclick = ()=> Scan.scanList(SC.input.value);

    // Map-Scan wiring
    const mapListInput   = win.querySelector('#dt-map-list');
    const mapBaseInput   = win.querySelector('#dt-map-basedirs');
    const mapScanButton  = win.querySelector('#dt-scan-maps');
    mapScanButton.onclick = ()=> Scan.scanMaps(mapListInput.value, mapBaseInput.value);

    // Hotkeys
    window.addEventListener('keydown', (ev)=>{
      if (ev.altKey && (ev.key==='d' || ev.key==='D')) { state.minimized? showWindow() : hideWindow(); ev.preventDefault(); }
      if (ev.altKey && ev.key==='1'){ setActiveTab('console'); showWindow(); }
      if (ev.altKey && ev.key==='2'){ setActiveTab('assets');  showWindow(); }
      if (ev.altKey && ev.key==='3'){ setActiveTab('scan');    showWindow(); }
    });

    // Defaults
    SC.input.value = [
      '/index.html',
      '/boot.js',
      '/game.js',
      '/tools/map-runtime.js',
      '/core/assets.js',
      '/core/terrain.js',
      '/core/camera.js',
      '/core/carriers.js'
    ].join('\n');

    setActiveTab(state.activeTab||'assets');
    state.minimized ? (win.style.display='none') : (win.style.display='block');
    updateToggleBtn();
  }

  function showWindow(){ win.style.display='block'; state.minimized=false; saveState(); updateToggleBtn(); }
  function hideWindow(){ win.style.display='none'; state.minimized=true; saveState(); updateToggleBtn(); }
  function setActiveTab(id){
    state.activeTab = id; saveState();
    bar.querySelectorAll('.tab').forEach(el=> el.classList.toggle('active', el.dataset.tab===id));
    win.querySelectorAll('#dt-head .tab').forEach(el=> el.classList.toggle('active', el.dataset.tab===id));
    win.querySelectorAll('.dt-panel').forEach(p=> p.classList.toggle('active', p.id === 'dt-panel-'+id));
  }
  function updateToggleBtn(){
    const t = bar.querySelector('#dt-toggle');
    t.innerHTML = (state.minimized?ICONS.maximize:ICONS.minimize)+`<span>${state.minimized?'Max':'Min'}</span>`;
  }
  function updateBadges(){
    const r = Assets.report();
    const b = bar.querySelector('#dt-badge-missing');
    if (b){ b.textContent = String(r.missing.length); }
  }

  function renderAssets(){
    if (!A.table || !A.issues || !A.stats) { updateBadges(); return; }
    const r = Assets.report();
    A.stats.textContent = `Loaded: ${r.counts.loaded} • Images: ${r.counts.images} • JSON: ${r.counts.json} • JS: ${r.counts.js} • Expected: ${r.counts.expected}`;
    const E = A.loaded.slice(-400);
    A.table.innerHTML = E.map((e,i)=>`
      <tr>
        <td>${A.loaded.length - E.length + i + 1}</td>
        <td>${e.type||''}</td>
        <td><code class="mono">${escapeHtml(e.path)}</code></td>
        <td>${e.status||''}</td>
        <td style="text-align:right">${fmtBytes(e.bytes)}</td>
        <td style="text-align:right">${e.t}</td>
      </tr>`).join('');

    // Expected-Matrix mit ✅/❌/⚠️ + Alias-Vorschläge
    const expectedAll = [...A.expected];
    const loadedSet = new Set(A.loaded.map(e=>e.path));
    const failuresSet = new Set([...A.failures.keys()]);
    const byBaseLoaded = new Map();
    for (const p of loadedSet){ const base=p.split('/').pop(); if(!byBaseLoaded.has(base)) byBaseLoaded.set(base, []); byBaseLoaded.get(base).push(p); }

    const rowsExpected = expectedAll.map((p,i)=>{
      let statusHTML = badge(`${ICON_OK} geladen`, '#30b06f');
      let extra = '';
      if (!loadedSet.has(p)) {
        statusHTML = badge(`${ICON_FAIL} fehlt`, '#e05252');
        if (failuresSet.has(p)) extra = `<small style="opacity:.8">HTTP: ${(A.failures.get(p)||{}).status}</small>`;
        const base = p.split('/').pop();
        const alts = byBaseLoaded.get(base);
        if (alts && alts.length){
          statusHTML = badge(`${ICON_WARN} falscher Pfad`, '#f0ad4e');
          extra = `<div style="margin-top:2px">gefunden unter:<ul style="margin:2px 0 0 18px">${alts.map(a=>`<li><code class="mono">${escapeHtml(a)}</code></li>`).join('')}</ul></div>`;
        }
      }
      return `
        <tr>
          <td>${i+1}</td>
          <td><code class="mono">${escapeHtml(p)}</code></td>
          <td>${statusHTML}${extra?'<div>'+extra+'</div>':''}</td>
        </tr>`;
    }).join('');

    const aliasSuggestions = [];
    for (const p of expectedAll){
      if (loadedSet.has(p)) continue;
      const base = p.split('/').pop();
      const alts = byBaseLoaded.get(base);
      if (alts && alts.length){
        const best = [...alts].sort((a,b)=>a.length-b.length)[0];
        aliasSuggestions.push({ alias: best, canonical: p });
      }
    }

    A.issues.innerHTML = `
      <details open>
        <summary><b>Expected‑Status</b> — ${expectedAll.length}</summary>
        <table class="dt" style="margin-top:6px"><thead><tr>
          <th>#</th><th>Erwartet (Pfad)</th><th>Status</th>
        </tr></thead><tbody>${rowsExpected || '<tr><td colspan="3">—</td></tr>'}</tbody></table>
      </details>
      <details ${aliasSuggestions.length ? 'open' : ''}>
        <summary><b>Alias‑Vorschläge (alt → neu)</b> — ${aliasSuggestions.length}</summary>
        <ul style="margin:6px 0 0 16px">${aliasSuggestions.map(s=>`
          <li>${badge('Mapping','#2e86de')}
            <code class="mono">${escapeHtml(s.alias)}</code> → <code class="mono">${escapeHtml(s.canonical)}</code>
            <button class="dt-btn" data-add-alias="${escapeHtml(s.alias)}|${escapeHtml(s.canonical)}" style="margin-left:6px">übernehmen</button>
          </li>`).join('') || '<li>—</li>'}</ul>
        <div style="opacity:.8;margin-top:6px">„übernehmen“ legt eine Alias‑Regel (nur zur Laufzeit) an — ideal fürs sukzessive Aufräumen.</div>
      </details>
    `;
    A.issues.querySelectorAll('button[data-add-alias]').forEach(btn=>{
      btn.onclick = ()=>{
        const [alias, canonical] = btn.getAttribute('data-add-alias').split('|');
        Assets.addAlias(alias, canonical);
        renderAssets();
      };
    });

    updateBadges();
  }

  // ---------- Boot ----------
  function boot(){
    const dev = /[?&]dev=1/i.test(location.search);
    if (!dev) return;

    ensureUI();
    initConsoleHook();
    renderConsole();
    renderAssets();

    // sinnvolle Canonical-Roots
    Assets.setCanonicalRoots(['/assets/','/assets/tiles/','/assets/terrain/','/textures/','/img/','/maps/','/core/','/tools/']);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
