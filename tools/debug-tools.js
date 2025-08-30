// tools/debug-tools.js
// DebugTools v2 — Bottom Dock (Min/Max) + Tabbed Window (Konsole | Assets | Scan)
// Toggle: Alt+D  |  Tabs: Alt+1/2/3  |  Persistenz in localStorage
// Features: Expected vs. Loaded (✅/❌/⚠️), Alias-Vorschläge, Scan Sources, Map-Scan, Exporte

(function(){
  const ORIGIN = location.origin;
  const LS_KEY = 'dt.v2.state';
  const state = loadState() || { minimized:true, activeTab:'assets' };

  // Robust: Toolbar-Getter (falls UI noch nicht aufgebaut ist)
  function __dt_getBar(){
    return document.getElementById('dt-bar')
        || document.getElementById('dev-toolbar')
        || document.querySelector('[data-dev-bar]')
        || null;
  }

  // ---------- Utils ----------
  const toPath = (u)=>{ try{ const url=new URL(u,ORIGIN); return url.origin===ORIGIN ? (url.pathname+(url.search||'')) : url.href; }catch{ return String(u||''); } };
  const normalize = (p)=>{
    if(!p) return '';
    if(/^https?:\/\//i.test(p)){ try{ const u=new URL(p); return u.pathname+(u.search||''); }catch{ return p; } }
    const a=document.createElement('a'); a.href=p; return a.pathname+(a.search||'');
  };
  const fmtBytes = (n)=> n==null ? '' : (n<1024? n+' B' : n<1048576? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(2)+' MB');
  const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));
  const download = (blob, name)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); };
  const escapeHtml = (s)=> String(s).replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function saveState(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch{} }
  function loadState(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||''); }catch{ return null; } }
  function badge(html, color){ return `<span style="display:inline-block;border:1px solid ${color};color:${color};font-size:11px">${html}</span>`; }
  const ICON_OK='✅', ICON_FAIL='❌', ICON_WARN='⚠️';

  // ---------- Root/Public ----------
  const DT = window.DebugTools = window.DebugTools || {};
  DT.version = '2.0';

  // ---------- Console ----------
  const Console = DT.Console = (function(){
    const buf = [];
    const MAX = 2000;
    const orig = {
      log:console.log.bind(console),
      warn:console.warn.bind(console),
      error:console.error.bind(console)
    };
    function push(kind, args){
      const t = new Date().toTimeString().slice(0,8);
      const line = `[${t}] ${kind.toUpperCase()} ${args.map(a=> typeof a==='string'?a:JSON.stringify(a)).join(' ')}`;
      buf.push(line);
      if (buf.length>MAX) buf.shift();
    }
    console.log = function(){ push('log', Array.from(arguments)); return orig.log.apply(console, arguments); };
    console.warn = function(){ push('warn', Array.from(arguments)); return orig.warn.apply(console, arguments); };
    console.error = function(){ push('err', Array.from(arguments)); return orig.error.apply(console, arguments); };
    function dump(){ return buf.join('\n'); }
    return { dump, buf };
  })();

  // ---------- Assets ----------
  const Assets = DT.Assets = (function(){
    const loaded = new Map();       // path -> {type,size,ok}
    const expected = new Set();     // paths we expect to find
    const byBaseLoaded = new Map(); // baseName -> [fullPaths]

    function trackLoaded(path, meta){
      const p = normalize(path);
      loaded.set(p, meta||{});
      const base = p.split('/').pop();
      if (!byBaseLoaded.has(base)) byBaseLoaded.set(base, []);
      byBaseLoaded.get(base).push(p);
    }

    function addExpected(path){ expected.add(normalize(path)); }
    function addExpectedAll(arr){ if (Array.isArray(arr)) arr.forEach(addExpected); }

    function report(){
      const loadedSet = new Set(loaded.keys());
      const expectedAll = Array.from(expected.values());
      const missing = [], ok = [], aliasSuggestions = [];

      for (const p of expectedAll){
        if (loadedSet.has(p)) continue;
        const base = p.split('/').pop();
        const alts = byBaseLoaded.get(base);
        if (alts && alts.length){
          const best = [...alts].sort((a,b)=>a.length-b.length)[0];
          aliasSuggestions.push({ alias: best, canonical: p });
        } else {
          missing.push(p);
        }
      }

      for (const p of loadedSet){
        if (!expected.has(p)) ok.push(p);
      }

      const counts = {
        loaded: loaded.size,
        images: Array.from(loaded).filter(([p,m])=>/\.png|\.jpg|\.jpeg|\.gif|\.webp$/i.test(p)).length,
        json:   Array.from(loaded).filter(([p,m])=>/\.jsonc?$/i.test(p)).length,
        js:     Array.from(loaded).filter(([p,m])=>/\.m?js$/i.test(p)).length,
        expected: expected.size
      };
      return { missing, ok, loaded, counts, aliasSuggestions };
    }

    return { trackLoaded, addExpected, addExpectedAll, report };
  })();

  // ---------- UI Elements ----------
  let win=null, bar=null;
  const A = { table:null, stats:null, issues:null };

  function buildUI(){
    if (document.getElementById('dt-win')) return;

    const style = document.createElement('style');
    style.textContent = `
      #dt-win { position:fixed; left:10px; right:10px; bottom:10px; background:#0b1220; color:#e8eefc; border:1px solid #25324a; border-radius:12px;
        z-index:2147483647; box-shadow:0 16px 60px rgba(0,0,0,.55); display:none; font:12px/1.45 system-ui,Segoe UI,Roboto,Arial,sans-serif; }
      #dt-head { display:flex; align-items:center; gap:8px; border-bottom:1px solid #21334d; padding:8px 10px; background:#0f1521; }
      #dt-head .tab { display:flex; align-items:center; gap:6px; padding:6px 10px; border-radius:8px; cursor:pointer; color:#cfe3ff; }
      #dt-head .tab.active { background:#1a2537; }
      #dt-body { padding:8px 10px; overflow:auto; max-height:calc(60vh - 42px); }
      .dt-panel { display:none; } .dt-panel.active { display:block; }

      .dt-cons { background:#0c1320; border:1px solid #21334d; border-radius:8px; padding:8px; height:calc(60vh - 120px); overflow:auto; font:12px ui-monospace; }

      table.dt { width:100%; border-collapse:collapse; }
      table.dt th, table.dt td { border-bottom:1px solid #21334d; padding:6px; font-size:12px; }
      table.dt thead th { position:sticky; top:0; background:#0f1521; }
      code.mono { font-family:ui-monospace,Consolas,monospace; }
    `;
    document.head.appendChild(style);

    win = document.createElement('div'); win.id='dt-win';
    win.innerHTML = `
      <div id="dt-head">
        <div class="tab active" data-tab="console">Konsole</div>
        <div class="tab" data-tab="assets">Assets</div>
        <div class="tab" data-tab="scan">Scan</div>
        <div style="flex:1"></div>
        <button id="dt-toggle" style="margin-left:auto">▣ Min</button>
      </div>
      <div id="dt-body">
        <div id="dt-panel-console" class="dt-panel active"><pre class="dt-cons" id="dt-cons"></pre></div>
        <div id="dt-panel-assets" class="dt-panel">
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
            <div id="dt-stats"></div>
            <div style="flex:1"></div>
            <div>${badge('Missing','var(--warn,#ffb100)')} <span id="dt-badge-missing">0</span></div>
            <button id="dt-export">Export</button>
          </div>
          <div id="dt-issues"></div>
          <table class="dt"><thead><tr>
            <th>#</th><th>Pfad</th><th>Typ</th><th>Größe</th>
          </tr></thead><tbody id="dt-rows"></tbody></table>
        </div>
        <div id="dt-panel-scan" class="dt-panel">
          <div style="margin-bottom:8px">
            <button id="dt-scan-sources">Page-Sources scannen</button>
            <button id="dt-export-expected">Expected exportieren</button>
          </div>
          <div id="dt-scan-result"></div>
        </div>
      </div>
    `;
    document.body.appendChild(win);

    bar = document.createElement('div');
    bar.id = 'dt-bar';
    bar.innerHTML = `
      <div class="tab" data-tab="console">Konsole</div>
      <div class="tab" data-tab="assets">Assets <span id="dt-badge-missing" class="mono">0</span></div>
      <div class="tab" data-tab="scan">Scan</div>
      <button id="dt-toggle" title="Min/Max">▣ Min</button>
    `;
    bar.style.cssText = "position:fixed; right:10px; bottom:10px; z-index:2147483647; display:flex; gap:8px; align-items:center; background:#0f1521; color:#e8eefc; border:1px solid #25324a; border-radius:12px; padding:6px 8px;";

    document.body.appendChild(bar);

    // Events
    bar.addEventListener('click', (e)=>{
      const t = e.target.closest ? e.target.closest('.tab,[id=dt-toggle]') : e.target;
      if (!t) return;
      if (t.id==='dt-toggle'){ if (win.style.display==='none' || !win.style.display) showWindow(); else hideWindow(); return; }
      if (t.classList.contains('tab')) setActiveTab(t.getAttribute('data-tab'));
    });

    const headTabs = win.querySelectorAll('#dt-head .tab');
    headTabs.forEach(el=> el.addEventListener('click', ()=> setActiveTab(el.getAttribute('data-tab')) ));

    // Panels refs
    A.table  = win.querySelector('#dt-rows');
    A.stats  = win.querySelector('#dt-stats');
    A.issues = win.querySelector('#dt-issues');

    // Export
    win.querySelector('#dt-export').addEventListener('click', exportLoaded);
    win.querySelector('#dt-export-expected').addEventListener('click', exportExpected);

    // Startzustand
    if (!state.minimized) showWindow(); else hideWindow();
    setActiveTab(state.activeTab||'assets');
    updateBadges();
    updateToggleBtn();
  }

  function showWindow(){ win.style.display='block'; state.minimized=false; saveState(); updateToggleBtn(); }
  function hideWindow(){ win.style.display='none'; state.minimized=true; saveState(); updateToggleBtn(); }

  // robust: Tabs + Panels auch ohne vorhandene bar/DOM updaten
  function setActiveTab(id){
    state.activeTab = id; saveState();
    const _bar = __dt_getBar();
    if (_bar){
      _bar.querySelectorAll('.tab').forEach(el=> el.classList.toggle('active', el.dataset.tab===id));
    }
    if (win){
      win.querySelectorAll('#dt-head .tab').forEach(el=> el.classList.toggle('active', el.dataset.tab===id));
      win.querySelectorAll('.dt-panel').forEach(p=> p.classList.toggle('active', p.id === 'dt-panel-'+id));
    }
  }

  function updateToggleBtn(){
    const _bar = __dt_getBar();
    if (!_bar) return;
    const t = _bar.querySelector('#dt-toggle');
    if (t){
      t.innerHTML = (state.minimized?ICONS.maximize:ICONS.minimize)+`<span>${state.minimized?'Max':'Min'}</span>`;
    }
  }

  function updateBadges(){
    const _bar = __dt_getBar();
    if (!_bar || !Assets || !Assets.report) return;
    const r = Assets.report();
    const b = _bar.querySelector('#dt-badge-missing');
    if (b){ b.textContent = String(r.missing.length); }
  }

  function renderAssets(){
    if (!A.table || !A.issues || !A.stats) { updateBadges(); return; }
    const r = Assets.report();
    A.stats.textContent = `Loaded: ${r.counts.loaded} • Images: ${r.counts.images} • JSON: ${r.counts.json} • JS: ${r.counts.js} • Expected: ${r.counts.expected}`;

    const rows = [];
    let i=0;
    for (const [p,m] of r.loaded){
      rows.push(`<tr><td>${++i}</td><td><code class="mono">${escapeHtml(p)}</code></td><td>${m.type||''}</td><td>${fmtBytes(m.size)}</td></tr>`);
    }
    A.table.innerHTML = rows.join('');

    const issues = [];
    if (r.missing.length){
      issues.push(`<p>${badge(ICON_FAIL+' Missing', '#ff7a7a')} • ${r.missing.length}</p><ul>` +
        r.missing.map(p=> `<li><code class="mono">${escapeHtml(p)}</code></li>`).join('') + `</ul>`);
    }
    if (r.aliasSuggestions.length){
      issues.push(`<p>${badge(ICON_WARN+' Alias-Kandidaten', '#ffb100')} • ${r.aliasSuggestions.length}</p><ul>` +
        r.aliasSuggestions.map(a=> `<li><code class="mono">${escapeHtml(a.canonical)}</code> ↔ <code class="mono">${escapeHtml(a.alias)}</code></li>`).join('') + `</ul>`);
    }
    A.issues.innerHTML = issues.join('') || '<p>Keine offenen Punkte.</p>';

    updateBadges();
  }

  // ---------- Scanner ----------
  async function scanPageSources(){
    const out = [];
    document.querySelectorAll('link[rel=stylesheet]').forEach(l=> out.push({ type:'css', href: toPath(l.href) }));
    document.querySelectorAll('script[src]').forEach(s=> out.push({ type:'js', href: toPath(s.src) }));
    return out;
  }

  // ---------- Exporte ----------
  function exportLoaded(){
    const r = Assets.report();
    const json = JSON.stringify({
      loaded:Array.from(r.loaded),
      counts:r.counts
    }, null, 2);
    download(new Blob([json], {type:'application/json'}), 'loaded.json');
  }
  function exportExpected(){
    const json = JSON.stringify({
      expected:Array.from(DT.Assets ? DT.Assets.expected||[] : [])
    }, null, 2);
    download(new Blob([json], {type:'application/json'}), 'expected.json');
  }

  // ---------- Keyboard ----------
  window.addEventListener('keydown', (e)=>{
    if (e.altKey && e.code==='KeyD'){ e.preventDefault(); if (win && win.style.display==='block') hideWindow(); else showWindow(); }
    if (e.altKey && (e.code==='Digit1'||e.code==='Numpad1')){ e.preventDefault(); setActiveTab('console'); }
    if (e.altKey && (e.code==='Digit2'||e.code==='Numpad2')){ e.preventDefault(); setActiveTab('assets'); }
    if (e.altKey && (e.code==='Digit3'||e.code==='Numpad3')){ e.preventDefault(); setActiveTab('scan'); }
  }, {passive:true});

  // ---------- Boot ----------
  function boot(){
    buildUI();
    renderAssets();
    // bekannte/erwartete Assets optional hier registrieren …
  }

  // Auto-Boot nach UI-Ready
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Public API
  DT.boot = boot;
  DT.Assets = Assets;
  DT.Console = Console;
})();
