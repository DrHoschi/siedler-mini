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
  Scan.scanMaps = async function(mapListStr, baseDirsStr
