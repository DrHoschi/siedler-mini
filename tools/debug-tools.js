// tools/debug-tools.js
// DebugTools: Log-Overlay + Assets-Inspector + Source-Scanner
// Sichtbar bei ?dev=1  |  Toggle: Alt + D

(function(){
  const ORIGIN = location.origin;

  // ---------- Utils ----------------------------------------------------------
  const toPath = (u) => {
    try { const url = new URL(u, ORIGIN); return url.href.startsWith(ORIGIN) ? url.pathname + (url.search||'') : url.href; }
    catch { return String(u || ''); }
  };
  const normalize = (p)=>{
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) { try { const u = new URL(p); return u.pathname + (u.search||''); } catch { return p; } }
    const a = document.createElement('a'); a.href = p; return a.pathname + (a.search||'');
  };
  const guessType = (path)=>{
    const lower = path.toLowerCase();
    return lower.endsWith('.png')||lower.endsWith('.jpg')||lower.endsWith('.jpeg')||lower.endsWith('.webp')||lower.endsWith('.gif') ? 'image' :
           lower.endsWith('.json') ? 'json' :
           lower.endsWith('.js')   ? 'script' :
           lower.endsWith('.css')  ? 'css' :
           lower.endsWith('.mp3')||lower.endsWith('.ogg')||lower.endsWith('.wav') ? 'audio' :
           lower.endsWith('.ttf')||lower.endsWith('.otf')||lower.endsWith('.woff')||lower.endsWith('.woff2') ? 'font' :
           'fetch';
  };
  const fmtBytes = (n)=> n==null ? '' : (n<1024? n+' B' : n<1048576? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(2)+' MB');
  const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));
  const download = (blob, name)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); };

  // ---------- Root Object ----------------------------------------------------
  const DT = window.DebugTools = window.DebugTools || {};

  // ---------- State: Console HUD --------------------------------------------
  const CON = DT.__console = DT.__console || { enabled:true, lines:[] };

  // ---------- State: Assets Inspector ---------------------------------------
  const A = DT.Assets = DT.Assets || {};
  const S = A.__state = A.__state || {
    enabled:true,
    start: performance.now(),
    expected: new Set(),      // SOLL-Pfade
    aliases: new Map(),       // alias -> canonical
    canonicalRoots: [],       // z.B. ['/assets/terrain/','/assets/ui/']
    loaded: [],               // chronologisch
    byPath: new Map(),        // path -> {count, types:Set, bytes?, status?}
    failures: new Map(),      // path -> {status}
  };

  // ---------- Console HUD (top Banner / bottom overlay) ---------------------
  function initConsoleHUD(){
    if (document.getElementById('debugToolsBar')) return;
    const bar = document.createElement('div');
    bar.id = 'debugToolsBar';
    Object.assign(bar.style, {
      position:'fixed', left:'50%', top:'10px', transform:'translateX(-50%)',
      background:'#0c1320cc', color:'#cfe3ff', border:'1px solid #21334d',
      borderRadius:'10px', padding:'8px 12px', zIndex: 2147483646,
      font:'12px ui-monospace', cursor:'pointer', userSelect:'none'
    });
    bar.textContent = ' Debug-Tools (klick)';
    document.body.appendChild(bar);

    const overlay = document.createElement('div');
    overlay.id = 'debugOverlay';
    Object.assign(overlay.style, {
      position:'fixed', left:'8px', right:'8px', bottom:'8px', maxHeight:'38vh',
      background:'#0c1320cc', border:'1px solid #21334d', color:'#cfe3ff',
      borderRadius:'10px', zIndex: 2147483645, display:'none',
      boxShadow:'0 12px 40px rgba(0,0,0,.35)', backdropFilter:'blur(4px)'
    });
    const head = document.createElement('div');
    Object.assign(head.style, {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderBottom:'1px solid #21334d',font:'12px ui-monospace'});
    head.innerHTML = `Debug-Konsole`;
    const btns = document.createElement('div');
    const btnClear = document.createElement('button'); const btnClose = document.createElement('button');
    [btnClear,btnClose].forEach(b=>Object.assign(b.style,{background:'#0f1b29',color:'#cfe3ff',border:'1px solid #21334d',borderRadius:'8px',padding:'4px 8px',marginLeft:'6px',cursor:'pointer'}));
    btnClear.textContent='Clear'; btnClose.textContent='Close';
    btns.append(btnClear,btnClose); head.appendChild(btns); overlay.appendChild(head);
    const body = document.createElement('div');
    Object.assign(body.style,{padding:'8px 10px',font:'12px/1.4 ui-monospace',overflow:'auto',maxHeight:'calc(38vh - 42px)'}); overlay.appendChild(body);
    document.body.appendChild(overlay);

    bar.addEventListener('click', ()=> overlay.style.display = (overlay.style.display==='none') ? 'block' : 'none');
    btnClose.addEventListener('click', ()=> overlay.style.display='none');
    btnClear.addEventListener('click', ()=> { body.innerHTML=''; CON.lines.length=0; });

    function logToOverlay(type, args){
      const line = document.createElement('div');
      line.style.whiteSpace='pre-wrap';
      line.style.color = type==='error' ? '#ff6b6b' : (type==='warn' ? '#f3d250' : '#cfe3ff');
      const ts = new Date().toLocaleTimeString();
      line.textContent = `[${ts}] [${type}] ` + args.map(x => (typeof x==='string'? x : (x && x.message) || JSON.stringify(x))).join(' ');
      body.appendChild(line); body.scrollTop = body.scrollHeight; CON.lines.push(line.textContent);
    }

    ['log','warn','error'].forEach(type=>{
      if (CON['__orig_'+type]) return; // nicht doppelt patchen
      const orig = console[type].bind(console);
      CON['__orig_'+type] = orig;
      console[type] = (...args)=>{ try{orig(...args);}catch{} try{logToOverlay(type,args);}catch{} };
    });

    window.addEventListener('error', e => { console.error('Fehler:', e.message, 'bei', e.filename, 'Zeile', e.lineno); });
    window.addEventListener('unhandledrejection', e => { console.error('Unhandled Promise Rejection:', e.reason); });
  }

  // ---------- Assets Inspector API ------------------------------------------
  A.expect = function(listOrText){
    if (Array.isArray(listOrText)) listOrText.forEach(p=> S.expected.add(normalize(p)));
    else if (typeof listOrText === 'string') listOrText.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(p=> S.expected.add(normalize(p)));
    renderAssets();
  };
  A.expectFromJSON = async function(source){
    try{
      if (typeof source==='string'){ const r=await fetch(source); const json=await r.json(); const arr = Array.isArray(json)? json : (json.paths||json.expected||[]); A.expect(arr); }
      else if (source && (Array.isArray(source.paths)||Array.isArray(source.expected))) { A.expect(source.paths || source.expected); }
    }catch(e){ console.warn('expectFromJSON',e); }
  };
  A.addAlias = (aliasPath, canonicalPath)=> S.aliases.set(normalize(aliasPath), normalize(canonicalPath));
  A.setCanonicalRoots = (arr)=> { S.canonicalRoots = [...arr]; };
  A.markLoaded = function(path, type, extras={}){
    addLoaded(normalize(path), type || guessType(path), extras);
  };
  A.checkExists = async function(paths, {concurrency=8, method='HEAD'}={}){
    const list = paths ? paths.map(normalize) : [...S.expected];
    const queue = list.slice();
    async function worker(){ while(queue.length){ const p=queue.shift(); try{ const r=await fetch(p,{method}); if(!r.ok) S.failures.set(p,{status:r.status}); }catch{ S.failures.set(p,{status:'ERR'}); } await sleep(0);} }
    await Promise.all(new Array(concurrency).fill(0).map(()=>worker()));
    renderAssets(); return S.failures;
  };
  A.report = function(){
    const loadedPaths = new Set(S.loaded.map(e=>e.path));
    const normalizedExpected = new Set([...S.expected].map(canonicalize));
    const missing = [...normalizedExpected].filter(p=> !loadedPaths.has(p) && !S.failures.has(p));

    const baseMap = new Map();
    const allPaths = new Set([...normalizedExpected, ...loadedPaths]);
    for (const p of allPaths){ const base=p.split('/').pop(); if(!baseMap.has(base)) baseMap.set(base,[]); baseMap.get(base).push(p); }
    const duplicates = [...baseMap.entries()].filter(([,arr])=>arr.length>1);

    const wrongPath = [];
    for (const e of S.loaded){ const canon = canonicalize(e.path); if (canon!==e.path) wrongPath.push({loaded:e.path, canonical:canon}); }

    return {
      expected: [...normalizedExpected],
      loaded: S.loaded.slice(),
      missing,
      failures: [...S.failures.entries()].map(([path,info])=>({path,...info})),
      duplicates,
      wrongPath,
      byPath: [...S.byPath.entries()].map(([path,info])=>({path,count:info.count,types:[...info.types],bytes:info.bytes||0,status:info.status||null})),
    };
  };
  A.exportJSON = ()=> download(new Blob([JSON.stringify(A.report(),null,2)],{type:'application/json'}),'assets-report.json');
  A.exportCSV  = ()=>{
    const r=A.report(); const rows=[['type','path','extra']];
    r.missing.forEach(p=>rows.push(['missing',p,'']));
    r.failures.forEach(f=>rows.push(['failure',f.path,f.status]));
    r.wrongPath.forEach(w=>rows.push(['wrongPath',w.loaded,w.canonical]));
    r.duplicates.forEach(([base,arr])=>arr.forEach(p=>rows.push(['duplicate('+base+')',p,''])));
    const csv=rows.map(cols=>cols.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    download(new Blob([csv],{type:'text/csv'}),'assets-report.csv');
  };
  A.show = ()=>{ ensureAssetsUI(); assetsRoot.style.display='block'; S.enabled=true; renderAssets(); };
  A.hide = ()=>{ if(assetsRoot) assetsRoot.style.display='none'; S.enabled=false; };
  A.clear= ()=>{ S.loaded.length=0; S.byPath.clear(); S.failures.clear(); renderAssets(); };

  function canonicalize(p){
    const n = normalize(p);
    if (S.aliases.has(n)) return S.aliases.get(n);
    if (S.canonicalRoots.length){
      const base = n.split('/').pop();
      for (const root of S.canonicalRoots){
        const candidate = (root.endsWith('/')? root+base : root+'/'+base);
        if (S.byPath.has(candidate) || S.expected.has(candidate)) return candidate;
      }
    }
    return n;
  }
  function addLoaded(path, type, extras={}){
    if (!path) return;
    const rec = { t: Math.round(performance.now()-S.start), type: type||guessType(path), path, status: extras.status, bytes: extras.bytes };
    S.loaded.push(rec);
    const info = S.byPath.get(path) || {count:0, types:new Set(), bytes:0, status:null};
    info.count++; info.types.add(rec.type); if(rec.bytes) info.bytes+=(rec.bytes|0); if(rec.status) info.status=rec.status;
    S.byPath.set(path,info);
    if (S.enabled) renderAssets();
  }

  // ---------- Hooks: fetch / <img>.src / audio.src --------------------------
  if (!A.__hooksInstalled){
    A.__hooksInstalled = true;
    const origFetch = window.fetch;
    window.fetch = async function(input, init){
      const url = typeof input==='string' ? input : (input && input.url) || '';
      const path = toPath(url);
      let resp, status, bytes;
      try{
        resp = await origFetch.call(this,input,init);
        status = resp.status;
        const cl = resp.headers && resp.headers.get('content-length'); bytes = cl ? parseInt(cl,10) : undefined;
        return resp;
      } finally {
        addLoaded(normalize(path), guessType(path), {status, bytes});
      }
    };
    const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
    Object.defineProperty(HTMLImageElement.prototype,'src',{
      set:function(v){ addLoaded(normalize(toPath(v)),'image',{}); return imgDesc.set.call(this,v); },
      get:function(){ return imgDesc.get.call(this); }
    });
    if (window.HTMLAudioElement){
      const auDesc = Object.getOwnPropertyDescriptor(HTMLAudioElement.prototype,'src');
      if (auDesc && auDesc.set){
        Object.defineProperty(HTMLAudioElement.prototype,'src',{
          set:function(v){ addLoaded(normalize(toPath(v)),'audio',{}); return auDesc.set.call(this,v); },
          get:function(){ return auDesc.get.call(this); }
        });
      }
    }
  }

  // ---------- Assets HUD (mit Scan Sources) ----------------------------------
  let assetsRoot=null, rowsEl=null, statsEl=null, issuesEl=null, pasteEl=null, scanSrcEl=null;

  function ensureAssetsUI(){
    if (assetsRoot) return;
    assetsRoot = document.createElement('div');
    assetsRoot.id = 'dt-assets';
    Object.assign(assetsRoot.style,{
      position:'fixed', left:0, right:0, bottom:0,
      font:'12px/1.4 system-ui,Segoe UI,Roboto,Arial,sans-serif',
      background:'rgba(18,18,18,.94)', color:'#eee', zIndex:2147483647,
      borderTop:'1px solid #333', backdropFilter:'blur(4px)'
    });
    assetsRoot.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;">
        <strong>DebugTools — Assets</strong>
        <button id="dt-min"   style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Min</button>
        <span id="dt-stats" style="opacity:.8"></span>
        <div style="margin-left:auto;display:flex;gap:6px">
          <button id="dt-scan"  style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Scan Sources</button>
          <button id="dt-copy"  style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Copy Pfad‑Liste</button>
          <button id="dt-json"  style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Export JSON</button>
          <button id="dt-csv"   style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Export CSV</button>
          <button id="dt-check" style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Existenz (HEAD)</button>
          <button id="dt-clear" style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Clear</button>
          <button id="dt-hide"  style="padding:4px 8px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Hide</button>
        </div>
      </div>
      <div id="dt-body" style="max-height:42vh;overflow:auto;border-top:1px solid #333">
        <div style="display:flex;gap:12px;padding:8px;border-bottom:1px solid #333;flex-wrap:wrap">
          <textarea id="dt-paste" placeholder="Erwartete Pfade hier reinkopieren (ein Pfad pro Zeile) …" style="flex:1 1 360px;min-height:64px;background:#111;color:#ddd;border:1px solid #444;border-radius:4px;padding:6px"></textarea>
          <textarea id="dt-scanSrc" placeholder="Zu scannende Quell-Dateien (ein Pfad pro Zeile) …" style="flex:1 1 360px;min-height:64px;background:#111;color:#ddd;border:1px solid #444;border-radius:4px;padding:6px"></textarea>
          <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap">
            <button id="dt-addExpected" style="padding:6px 10px;border:1px solid #444;background:#222;color:#ddd;border-radius:4px;cursor:pointer">Zu Expected hinzufügen</button>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead style="position:sticky;top:0;background:#1c1c1c">
            <tr>
              <th style="text-align:left;padding:6px;border-bottom:1px solid #333">#</th>
              <th style="text-align:left;padding:6px;border-bottom:1px solid #333">Typ</th>
              <th style="text-align:left;padding:6px;border-bottom:1px solid #333">Pfad</th>
              <th style="text-align:left;padding:6px;border-bottom:1px solid #333">Status</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #333">Bytes</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #333">t+ms</th>
            </tr>
          </thead>
          <tbody id="dt-rows"></tbody>
        </table>
        <div id="dt-issues" style="padding:8px;border-top:1px solid #333"></div>
      </div>
    `;
    document.documentElement.appendChild(assetsRoot);

    rowsEl   = assetsRoot.querySelector('#dt-rows');
    statsEl  = assetsRoot.querySelector('#dt-stats');
    issuesEl = assetsRoot.querySelector('#dt-issues');
    pasteEl  = assetsRoot.querySelector('#dt-paste');
    scanSrcEl= assetsRoot.querySelector('#dt-scanSrc');

    // Defaults für Scan-Liste
    scanSrcEl.value = [
      '/index.html',
      '/boot.js',
      '/game.js',
      '/core/asset.js',
      '/tools/map-runtime.js',
      '/tools/debug-tools.js',
      '/maps/map-pro.json'
    ].join('\n');

    assetsRoot.querySelector('#dt-min').onclick   = ()=>{
      const body = assetsRoot.querySelector('#dt-body');
      const btn  = assetsRoot.querySelector('#dt-min');
      const min  = body.style.display !== 'none';
      body.style.display = min ? 'none' : 'block';
      btn.textContent = min ? 'Max' : 'Min';
    };
    assetsRoot.querySelector('#dt-hide').onclick  = ()=> { assetsRoot.style.display='none'; S.enabled=false; };
    assetsRoot.querySelector('#dt-clear').onclick = ()=> { A.clear(); };
    assetsRoot.querySelector('#dt-json').onclick  = ()=> A.exportJSON();
    assetsRoot.querySelector('#dt-csv').onclick   = ()=> A.exportCSV();
    assetsRoot.querySelector('#dt-copy').onclick  = async ()=>{
      const lines = [...S.byPath.keys()].sort();
      try { await navigator.clipboard.writeText(lines.join('\n')); alert(`Kopiert: ${lines.length} Pfade`); }
      catch { download(new Blob([lines.join('\n')],{type:'text/plain'}),'pfade.txt'); }
    };
    assetsRoot.querySelector('#dt-check').onclick = ()=> A.checkExists();
    assetsRoot.querySelector('#dt-addExpected').onclick = ()=>{ A.expect(pasteEl.value); pasteEl.value=''; };
    assetsRoot.querySelector('#dt-scan').onclick = async ()=>{ const list = scanSrcEl.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); await scanSources(list); };

    window.addEventListener('keydown', (ev)=>{
      if (ev.altKey && (ev.key==='d' || ev.key==='D')){
        S.enabled = true;
        assetsRoot.style.display = (assetsRoot.style.display==='none'?'block':'none');
        if (assetsRoot.style.display!=='none') renderAssets();
      }
    });
  }

  function renderAssets(){
    if (!S.enabled) return;
    ensureAssetsUI();

    const E = S.loaded.slice(-400);
    rowsEl.innerHTML = E.map((e,i)=>`
      <tr>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a">${S.loaded.length - E.length + i + 1}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a;white-space:nowrap">${e.type||''}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a"><code style="font-family:ui-monospace,Consolas,monospace">${e.path}</code></td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a">${e.status||''}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a;text-align:right">${fmtBytes(e.bytes)}</td>
        <td style="padding:4px 6px;border-bottom:1px solid #2a2a2a;text-align:right">${e.t}</td>
      </tr>
    `).join('');

    const n = S.loaded.length;
    const img = S.loaded.filter(e=>e.type==='image').length;
    const json= S.loaded.filter(e=>e.type==='json').length;
    const js  = S.loaded.filter(e=>e.type==='script').length;
    statsEl.textContent = `Loaded: ${n} • Images: ${img} • JSON: ${json} • JS: ${js} • Expected: ${S.expected.size}`;

    const r = A.report();
    const dupHTML = r.duplicates.map(([base,arr])=>`<li><code>${base}</code><ul>${arr.map(p=>`<li><code>${p}</code></li>`).join('')}</ul></li>`).join('');
    const missHTML = r.missing.map(p=>`<li><code>${p}</code></li>`).join('');
    const failHTML = r.failures.map(f=>`<li><code>${f.path}</code> — <b>${f.status}</b></li>`).join('');
    const wrongHTML= r.wrongPath.map(w=>`<li><code>${w.loaded}</code> → <code>${w.canonical}</code></li>`).join('');

    issuesEl.innerHTML = `
      <details open>
        <summary><b>Missing (erwartet, aber weder geladen noch vorhanden)</b> — ${r.missing.length}</summary>
        <ul style="margin:6px 0 0 16px">${missHTML || '<li>—</li>'}</ul>
      </details>
      <details>
        <summary><b>Failures (HEAD/Fetch Probleme)</b> — ${r.failures.length}</summary>
        <ul style="margin:6px 0 0 16px">${failHTML || '<li>—</li>'}</ul>
      </details>
      <details>
        <summary><b>Doppelte Basenames</b> — ${r.duplicates.length}</summary>
        <ul style="margin:6px 0 0 16px">${dupHTML || '<li>—</li>'}</ul>
      </details>
      <details>
        <summary><b>Falscher Pfad (Alias/Canonical)</b> — ${r.wrongPath.length}</summary>
        <ul style="margin:6px 0 0 16px">${wrongHTML || '<li>—</li>'}</ul>
      </details>
    `;
  }

  // ---------- Regex Source Scanner ------------------------------------------
  // Extrahiert Asset-Pfade aus Quelltexten (JS/HTML/CSS/JSON)
  async function scanSources(files){
    if (!files || !files.length) return;
    const found = new Set();

    // Patterns:
    //  - JS/TS: fetch("..."), import("..."), new Image().src="...", audio.src="..."
    //  - HTML: <img src="...">, <link href="...">, <script src="...">, url("...") in style
    //  - CSS: url("..."), @font-face src: url(...)
    //  - Generisch: Strings mit bekannten Endungen
    const exts = '\\.(png|jpg|jpeg|webp|gif|json|js|css|mp3|ogg|wav|ttf|otf|woff2?|svg)\\b';
    const RE_GENERIC = new RegExp(
      // Quote-start
      '["\\\']' +
      // either absolute/relative path
      '([^"\\\']*' + exts + '(?:\\?[^"\\\']*)?)' +
      // Quote-end
      '["\\\']',
      'ig'
    );
    const RE_FETCH  = /fetch\s*\(\s*["'`]([^"'`]+)["'`]/ig;
    const RE_IMPORT = /import\s*\(\s*["'`]([^"'`]+)["'`]/ig;
    const RE_IMG    = /(?:new\s+Image\(\)|<img\b[^>]*?)\s(?:src|SRC)\s*=\s*["'`]([^"'`]+)["'`]/ig;
    const RE_LINK   = /<link\b[^>]*?href\s*=\s*["'`]([^"'`]+)["'`]/ig;
    const RE_SCRIPT = /<script\b[^>]*?src\s*=\s*["'`]([^"'`]+)["'`]/ig;
    const RE_STYLE  = /url$begin:math:text$\\s*["']?([^"')]+)["']?\\s*$end:math:text$/ig;

    async function processOne(path){
      try{
        const r = await fetch(path, {cache:'no-cache'});
        if (!r.ok) { console.warn('Scan: fetch miss', path, r.status); return; }
        const ct = r.headers.get('content-type') || '';
        const txt = await r.text();

        function pushAll(re){
          re.lastIndex = 0;
          let m; while ((m = re.exec(txt))) {
            const raw = m[1];
            if (!raw) continue;
            // relative Pfade relativ zum Datei-Standort auflösen
            let resolved;
            try {
              // Basis: aktuelle Datei als URL
              const base = new URL(path, ORIGIN);
              resolved = new URL(raw, base).pathname + (new URL(raw, base).search||'');
            } catch { resolved = raw; }
            // nur Projekt-Pfade
            if (/^https?:\/\//i.test(resolved) && !resolved.startsWith(ORIGIN)) return;
            const norm = normalize(resolved);
            if (norm) found.add(norm);
          }
        }

        // generisch nach Endungen
        pushAll(RE_GENERIC);
        // besondere JS/HTML-Fälle
        pushAll(RE_FETCH); pushAll(RE_IMPORT); pushAll(RE_IMG); pushAll(RE_LINK); pushAll(RE_SCRIPT); pushAll(RE_STYLE);

      } catch(e){
        console.warn('Scan error for', path, e);
      }
    }

    for (const f of files){ await processOne(normalize(f)); await sleep(0); }

    const arr = [...found];
    if (!arr.length){ alert('Scan: keine Pfade gefunden.'); return; }

    // in Expected übernehmen
    A.expect(arr);

    // Optional: sofortige HEAD-Existenzprüfung
    await A.checkExists(arr);

    // Feedback
    console.log('[DebugTools] ScanSources gefunden:', arr.length, 'Pfade');
    alert(`ScanSources: ${arr.length} Pfade gefunden und zu Expected hinzugefügt.`);
  }

  // ---------- Boot / Visibility ---------------------------------------------
  function boot(){
    // dev-Flag
    const qs = new URLSearchParams(location.search);
    const dev = /1|true|on/i.test(qs.get('dev') || '');
    if (!dev) return; // nur bei dev sichtbar

    initConsoleHUD();
    ensureAssetsUI();
    renderAssets();

    // sinnvolle Defaults:
    A.setCanonicalRoots(['/assets/','/maps/','/tools/','/core/','/ui/']);
  }

  // DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
