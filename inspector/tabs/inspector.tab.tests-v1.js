/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.tests-v1.js
 * Version : v25.11.01-plus
 * Zweck   : TESTS – Diagnose & Werkzeuge (Scripts, Events, Klassen, Layer)
 * Features:
 *   • Script-Scanner: alle <script>, ?v=Version, async/defer, Duplikate
 *   • Event-Listener-Zähler: Hook auf addEventListener (Typ/Target/Anzahl)
 *   • Klassen-Scanner: class Foo [extends Bar] (inkl. Vererbungs-Map)
 *   • Code-Signal-Scanner: 'cb:' / 'req:' / 'emit:' / dispatchEvent / addEventListener
 *                          data-ui / is-playing / is-inspector / #ids / querySelector
 *   • Layer-Scan & Highlight: Canvas/UI/HUD/Build/Inspector, z-index, Bounds
 *   • Copy/Export JSON: komplette Diagnose exportieren
 * Abhäng. : window.registerInspectorTab(name, setup)
 * Hinweis : Für Event-Zählung besser früh hooken; hier trotzdem aktiv & robust.
 * ========================================================================== */
(function(){
  if (typeof window.registerInspectorTab !== 'function') {
    console.warn('[tests-tab] registerInspectorTab fehlt.');
    return;
  }

  // ------------------------ [A] Early global hooks --------------------------
  // Event-Listener-Registry: Hook so früh wie möglich; idempotent
  (function hookEL(){
    if (window.__ELREG_HOOKED__) return;
    window.__ELREG_HOOKED__ = true;
    const REG = window.__ELREG__ = { all: [], byType: {}, byTarget: {} };
    const ET = window.EventTarget && window.EventTarget.prototype;
    if (!ET) return;

    const orig = ET.addEventListener;
    ET.addEventListener = function(type, listener, options){
      try{
        const tgt = this;
        const id  = (tgt && tgt.id) ? '#'+tgt.id : '';
        const tag = (tgt && tgt.tagName) ? tgt.tagName.toLowerCase() : (tgt===window?'window':(tgt===document?'document':'object'));
        const key = tag + (id?(''+id):'');
        const once = !!(options && options.once);
        const passive = !!(options && options.passive);
        const capture = !!(options && (options.capture===true));

        // Registry auffüllen
        REG.all.push({ type, key, once, passive, capture, ts: Date.now() });
        REG.byType[type] = (REG.byType[type]||0) + 1;
        REG.byTarget[key] = (REG.byTarget[key]||0) + 1;
      }catch(e){ /* niemals crashen */ }
      return orig.call(this, type, listener, options);
    };
  })();

  // ----------------------------- [B] Inline CSS -----------------------------
  function injectCSS(){
    if (document.getElementById('insp-tests-inline-style2')) return;
    const st = document.createElement('style');
    st.id = 'insp-tests-inline-style2';
    st.textContent = `
#inspector .tests-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.25rem 0 .75rem}
#inspector .tests-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .tests-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:.75rem}
#inspector .tests-card{border:1px solid #2a2a2e;border-radius:.6rem;padding:.6rem;background:#111}
#inspector .tests-card h4{margin:.1rem 0 .45rem}
#inspector .tests-pre{max-height:220px;overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.5rem;margin:0;white-space:pre}
#inspector .tests-kv{font-size:.9em}
#inspector .tests-kv b{opacity:.75}
#inspector .tests-badge{display:inline-block;border:1px solid #444;border-radius:.4rem;padding:.05rem .4rem;margin-left:.4rem;font-size:.85em;opacity:.85}
#inspector .tests-warn{color:#ffcc00}
#inspector .tests-err{color:#ff6666}
#inspector .tests-ok{color:#8ab4f8}
#inspector .tests-layer-outline{position:fixed;pointer-events:none;border:1px dashed #ffa500;outline:2px solid rgba(255,165,0,.25);z-index:2147483646}
#inspector .tests-layer-label{position:fixed;pointer-events:none;background:rgba(0,0,0,.7);color:#fff;font:12px/1.2 monospace;padding:.2rem .35rem;border-radius:.35rem;border:1px solid #222;z-index:2147483647;max-width:48vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    `;
    document.head.appendChild(st);
  }

  // ----------------------------- [C] Helpers -------------------------------
  const base = (url) => (url||'').split('?')[0].split('/').pop();
  const qver = (url) => {
    if (!url) return '';
    const q = url.split('?')[1] || '';
    const m = /(?:^|&)v=([^&]+)/i.exec(q);
    return m ? m[1] : '';
  };
  const toJSON = (o) => { try { return JSON.stringify(o, null, 2); } catch(e){ return String(e); } };
  const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));

  // ----------------------------- [D] Collectors ----------------------------
  function collectScriptsMeta(){
    const arr = [...document.scripts].map(s => {
      const src = s.src || '';
      return {
        src,
        file: base(src) || '(inline)',
        version: qver(src),
        async: !!s.async,
        defer: !!s.defer,
        type: s.type || 'text/javascript',
        inlineLen: !src && s.text ? s.text.length : 0
      };
    });
    const counts = arr.reduce((m,a)=> (m[a.file]=(m[a.file]||0)+1, m), {});
    const dupes = Object.entries(counts).filter(([_,c])=>c>1).map(([file,count])=>({file,count}));
    return { scripts: arr, duplicates: dupes };
  }

  async function fetchScriptText(script){
    if (!script) return { ok:false, reason:'no-script' };
    if (!script.src) {
      return { ok:true, text: script.text || '', inline:true };
    }
    try{
      const res = await fetch(script.src, { credentials: 'same-origin' });
      if (!res.ok) return { ok:false, reason:'http '+res.status };
      const text = await res.text();
      return { ok:true, text, url: script.src, inline:false };
    }catch(e){
      return { ok:false, reason:String(e) };
    }
  }

  // Regex-Scanner (defensiv, heuristisch – kein Full-Parser)
  function scanSignals(text){
    const out = {
      events: [],       // 'cb:*' / 'req:*' / 'emit:*'
      dispatches: 0,    // .dispatchEvent(
      listeners: 0,     // .addEventListener(
      ids: [],          // #foo in querySelector / getElementById
      dataUi: [],       // data-ui="..."
      bodyFlags: [],    // is-playing / is-inspector
      selectors: []     // querySelector(…), querySelectorAll(…)
    };
    if (!text) return out;
    const pushUniq = (arr, v)=>{ if (v && !arr.includes(v)) arr.push(v); };

    // Events (cb:/req:/emit:)
    (text.match(/\b(cb|req|emit):[a-z0-9:._-]+/gi) || []).forEach(e=>pushUniq(out.events,e));

    // dispatch / addEventListener
    out.dispatches = (text.match(/\.dispatchEvent\s*\(/g) || []).length;
    out.listeners  = (text.match(/\.addEventListener\s*\(/g) || []).length;

    // query selectors & ids
    (text.match(/querySelector(All)?\s*\(\s*(['"`])([^'"`]+)\2\s*\)/g) || []).forEach(m=>{
      const sel = m.replace(/^.*?\(\s*['"`]([^'"`]+).*$/,'$1');
      pushUniq(out.selectors, sel);
      if (/#([\w-]+)/.test(sel)) pushUniq(out.ids, '#'+RegExp.$1);
      if (/\[data-ui=['"`]([^'"`]+)['"`]\]/.test(sel)) pushUniq(out.dataUi, RegExp.$1);
    });

    // getElementById
    (text.match(/getElementById\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g) || []).forEach(m=>{
      const id = m.replace(/^.*?\(\s*['"`]([^'"`]+).*$/,'$1');
      pushUniq(out.ids, '#'+id);
    });

    // data-ui direct in markup (nur grobe Heuristik)
    (text.match(/data-ui\s*=\s*(['"`])([^'"`]+)\1/g) || []).forEach(m=>{
      const v = m.replace(/^.*=['"`]([^'"`]+).*$/,'$1');
      pushUniq(out.dataUi, v);
    });

    // body flags
    if (/is-playing/.test(text))   pushUniq(out.bodyFlags, 'is-playing');
    if (/is-inspector/.test(text)) pushUniq(out.bodyFlags, 'is-inspector');

    return out;
  }

  // Klassen finden (simple, robuste Heuristik)
  function scanClasses(text){
    const classes = [];
    if (!text) return classes;
    const re = /(?:export\s+)?class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_\.]+))?/g;
    let m;
    while ((m = re.exec(text))) {
      classes.push({ name: m[1], extends: m[2] || null });
    }
    return classes;
  }

  function buildInheritanceMap(allClasses){
    const byName = {};
    allClasses.forEach(c => { byName[c.name] = byName[c.name] || { name:c.name, parents:[] }; });
    allClasses.forEach(c => {
      if (c.extends) {
        const child = byName[c.name] || (byName[c.name]={name:c.name, parents:[]});
        child.parents.push(c.extends);
      }
    });
    return byName;
  }

  function collectLayers(){
    const pick = [
      '#game','#game-canvas','#ui-root','#hud-root','#build-dock',
      '#inspector','#inspector-fab','[data-ui="canvas"]','[data-ui="root"]','[data-ui="hud"]','[data-ui="build"]'
    ];
    const seen = new Set();
    const nodes = [];
    for (const sel of pick){
      document.querySelectorAll(sel).forEach(el=>{
        if (!el || seen.has(el)) return; seen.add(el);
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        nodes.push({
          sel, id: el.id||null, tag: el.tagName.toLowerCase(),
          visible: !!(r.width && r.height && cs.visibility!=='hidden' && cs.display!=='none'),
          z: cs.zIndex || 'auto', opacity: cs.opacity,
          bounds: { x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) }
        });
      });
    }
    return nodes;
  }

  // --------------------------- [E] Layer Highlight --------------------------
  const LAY = { marks:[], on:false };
  function clearLayerMarks(){ LAY.marks.forEach(n=>n.remove()); LAY.marks.length=0; }
  function markNode(bounds, label){
    const b=document.createElement('div'); b.className='tests-layer-outline';
    b.style.left=bounds.x+'px'; b.style.top=bounds.y+'px'; b.style.width=Math.max(1,bounds.w)+'px'; b.style.height=Math.max(1,bounds.h)+'px';
    const lab=document.createElement('div'); lab.className='tests-layer-label';
    lab.style.left=(bounds.x+2)+'px'; lab.style.top=(bounds.y-20)+'px'; lab.textContent=label;
    document.body.append(b,lab); LAY.marks.push(b,lab);
  }
  function toggleLayerMarks(on){
    LAY.on = (on==null) ? !LAY.on : !!on; clearLayerMarks(); if(!LAY.on) return;
    collectLayers().forEach(n=>{ if(!n.visible) return;
      const lbl = `${n.id ? '#'+n.id : n.tag}${n.z!=='auto'?' z='+n.z:''} ${n.bounds.w}×${n.bounds.h}`;
      markNode(n.bounds,lbl);
    });
  }

  // ------------------------------- [F] UI -----------------------------------
  function el(tag, cls, txt){ const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; }

  function render(section){
    section.innerHTML = '<h2>Tests</h2>';
    const tb = el('div','tests-toolbar');
    const bOpen=el('button','tests-btn','Open');   const bClose=el('button','tests-btn','Close');  const bToggle=el('button','tests-btn','Toggle');
    const bBuild=el('button','tests-btn','Build Snapshot'); const bRes=el('button','tests-btn','Res Snapshot');
    const bPaths=el('button','tests-btn','Path Overlay');   const bHeat=el('button','tests-btn','Heatmap');
    const bScan=el('button','tests-btn','Scan');    const bCopy=el('button','tests-btn','Copy JSON'); const bExport=el('button','tests-btn','Export JSON');
    const bLayer=el('button','tests-btn','Layer markieren');
    tb.append(bOpen,bClose,bToggle,bBuild,bRes,bPaths,bHeat,bScan,bCopy,bExport,bLayer);
    section.append(tb);

    const grid = el('div','tests-grid'); section.append(grid);

    const c1 = el('div','tests-card'); c1.innerHTML = `<h4>Globals</h4><div class="tests-kv" id="t-globals"></div>`; grid.append(c1);
    const c2 = el('div','tests-card'); c2.innerHTML = `<h4>Scripts <span class="tests-badge" id="t-scripts-count">0</span></h4><pre class="tests-pre" id="t-scripts-pre"></pre>`; grid.append(c2);
    const c3 = el('div','tests-card'); c3.innerHTML = `<h4>Duplikate</h4><pre class="tests-pre" id="t-dupes-pre">(keine)</pre>`; grid.append(c3);
    const c4 = el('div','tests-card'); c4.innerHTML = `<h4>Layers</h4><pre class="tests-pre" id="t-layers-pre"></pre>`; grid.append(c4);
    const c5 = el('div','tests-card'); c5.innerHTML = `<h4>Event-Listener</h4><pre class="tests-pre" id="t-el-pre"></pre>`; grid.append(c5);
    const c6 = el('div','tests-card'); c6.innerHTML = `<h4>Klassen</h4><pre class="tests-pre" id="t-classes-pre"></pre>`; grid.append(c6);
    const c7 = el('div','tests-card'); c7.innerHTML = `<h4>Code-Signale</h4><pre class="tests-pre" id="t-signals-pre"></pre>`; grid.append(c7);
    const c8 = el('div','tests-card'); c8.innerHTML = `<h4>Hinweise</h4><div id="t-hints"></div>`; grid.append(c8);

    const OUT = {
      globals: document.getElementById('t-globals'),
      scriptsCount: document.getElementById('t-scripts-count'),
      scriptsPre: document.getElementById('t-scripts-pre'),
      dupesPre: document.getElementById('t-dupes-pre'),
      layersPre: document.getElementById('t-layers-pre'),
      elPre: document.getElementById('t-el-pre'),
      classesPre: document.getElementById('t-classes-pre'),
      signalsPre: document.getElementById('t-signals-pre'),
      hintsBox: document.getElementById('t-hints')
    };

    // Button bindings
    bOpen.onclick = ()=> window.dispatchEvent(new CustomEvent('req:insp:open'));
    bClose.onclick= ()=> window.dispatchEvent(new CustomEvent('req:insp:close'));
    bToggle.onclick= ()=> window.Inspector?.toggle?.();
    bBuild.onclick = ()=> window.dispatchEvent(new CustomEvent('req:build:snapshot'));
    bRes.onclick   = ()=> window.dispatchEvent(new CustomEvent('req:res:snapshot'));
    bPaths.onclick = ()=> {
      const flag = !window.__TESTS_PATH_OVERLAY__;
      window.__TESTS_PATH_OVERLAY__ = flag;
      window.dispatchEvent(new CustomEvent(flag ? 'cb:path:overlay:on' : 'cb:path:overlay:off'));
      bPaths.textContent = flag ? 'Path Overlay (aus)' : 'Path Overlay (an)';
    };
    bHeat.onclick  = ()=> {
      const flag = !window.__TESTS_PATH_HEAT__;
      window.__TESTS_PATH_HEAT__ = flag;
      window.dispatchEvent(new CustomEvent(flag ? 'cb:path:heatmap:on' : 'cb:path:heatmap:off'));
      bHeat.textContent = flag ? 'Heatmap (aus)' : 'Heatmap (an)';
    };
    bLayer.onclick = ()=> toggleLayerMarks();

    bCopy.onclick  = ()=> copyDiagnosis();
    bExport.onclick= ()=> exportDiagnosis();
    bScan.onclick  = ()=> updateDiagnosis(true, OUT);

    // Initial
    updateDiagnosis(false, OUT);

    // Auto-Rescan, wenn Tab aktiv wird
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if (e?.detail?.tab === 'tests') updateDiagnosis(false, OUT);
    });
  }

  // ----------------------- [G] Diagnose-Aufbau -----------------------------
  async function updateDiagnosis(verbose, OUT){
    const scriptsMeta = collectScriptsMeta();
    const globals = {
      inspector: !!window.Inspector,
      inspectorContent: !!window.InspectorContent,
      registerInspectorTab: typeof window.registerInspectorTab === 'function',
      registry: !!window.Registry,
      uiBuild: !!window.UIBuild,
      pathOverlay: !!window.PathOverlay,
      bridge_v120: !!window.__INSPECTOR_BRIDGE_V120__,
      console_hooked: !!window.__INSPECTOR_CONSOLE_HOOKED__
    };
    const layers  = collectLayers();
    const elreg  = window.__ELREG__ || { all:[], byType:{}, byTarget:{} };

    // Skript-Quelltext laden & scannen (best-effort; CORS tolerant)
    const scripts = [...document.scripts];
    const perScript = [];
    for (const s of scripts){
      const meta = { file: base(s.src)||'(inline)', url: s.src||null, version:qver(s.src), async:!!s.async, defer:!!s.defer };
      const ft = await fetchScriptText(s);
      meta.ok = ft.ok; meta.inline = !!ft.inline; meta.err = ft.ok ? null : ft.reason;
      if (ft.ok){
        const text = ft.text;
        meta.classes = scanClasses(text);
        meta.signals = scanSignals(text);
      }
      perScript.push(meta);
      // kurze Verschnaufpause, UI nicht blockieren
      await sleep(0);
    }

    // Klassen global aggregieren
    const allClasses = perScript.flatMap(p => p.classes || []);
    const classMap = buildInheritanceMap(allClasses);

    // Code-Signale aggregieren
    const sigAgg = {
      events: [], dispatches:0, listeners:0, ids:[], dataUi:[], bodyFlags:[], selectors:[]
    };
    const addUniq = (arr,v)=>{ if(v && !arr.includes(v)) arr.push(v); };
    for (const p of perScript){
      const s = p.signals || {};
      (s.events||[]).forEach(v=>addUniq(sigAgg.events,v));
      (s.ids||[]).forEach(v=>addUniq(sigAgg.ids,v));
      (s.dataUi||[]).forEach(v=>addUniq(sigAgg.dataUi,v));
      (s.selectors||[]).forEach(v=>addUniq(sigAgg.selectors,v));
      (s.bodyFlags||[]).forEach(v=>addUniq(sigAgg.bodyFlags,v));
      sigAgg.dispatches += s.dispatches||0;
      sigAgg.listeners  += s.listeners||0;
    }

    // Hints
    const hints = [];
    if (scriptsMeta.duplicates.length){
      hints.push({type:'warn', msg:`${scriptsMeta.duplicates.length} doppelte Script-Datei(en)`});
    }
    if (!globals.registerInspectorTab){
      hints.push({type:'err', msg:`registerInspectorTab fehlt – Tabs rendern nicht`});
    }
    if (sigAgg.events.some(e=>/cb:boot:ready/i.test(e)) && sigAgg.events.some(e=>/cb:game:start/i.test(e))){
      // ok – gute Trennung
    }
    // Autostart-Heuristik: viele dispatchEvent + kaum User-Triggers
    if (sigAgg.dispatches > 10 && !sigAgg.events.some(e=>/req:ui:startpanel:hide/.test(e))){
      hints.push({type:'warn', msg:`Viele Auto-Dispatches erkannt → Autostart prüfen`});
    }

    // Diagnose-Objekt speichern
    const DIAG = window.__TESTS_DIAG__ = {
      ts: new Date().toISOString(),
      globals, scriptsMeta, layers,
      eventListeners: {
        total: elreg.all.length,
        byType: elreg.byType,
        byTarget: elreg.byTarget,
        sample: elreg.all.slice(-20) // letzte 20 Registrierungen
      },
      classes: {
        count: allClasses.length,
        list: allClasses,
        map: classMap
      },
      signals: sigAgg,
      perScript,
      hints
    };

    // Render
    if (OUT){
      OUT.globals.innerHTML = `
        <div><b>Inspector</b>: ${globals.inspector?'ja':'nein'}</div>
        <div><b>registerInspectorTab</b>: ${globals.registerInspectorTab?'ja':'<span class="tests-err">nein</span>'}</div>
        <div><b>Registry</b>: ${globals.registry?'ja':'nein'}</div>
        <div><b>UIBuild</b>: ${globals.uiBuild?'ja':'nein'}</div>
        <div><b>PathOverlay</b>: ${globals.pathOverlay?'ja':'nein'}</div>
        <div><b>Bridge v1.2.0</b>: ${globals.bridge_v120?'ja':'nein'}</div>
        <div><b>Console Hook</b>: ${globals.console_hooked?'ja':'nein'}</div>
      `;
      OUT.scriptsCount.textContent = String(scriptsMeta.scripts.length);
      OUT.scriptsPre.textContent   = (scriptsMeta.scripts.map(s=>{
        const flags = [s.async?'async':'', s.defer?'defer':'', s.version?('v='+s.version):''].filter(Boolean).join(' ');
        return `${s.file}${flags?('  ['+flags+']'):''}`;
      }).join('\n')) || '(keine)';
      OUT.dupesPre.textContent     = (scriptsMeta.duplicates.length ? scriptsMeta.duplicates.map(d=>`${d.file} × ${d.count}`).join('\n') : '(keine)');
      OUT.layersPre.textContent    = collectLayers().map(l=>{
        const id = l.id ? '#'+l.id : l.tag; return `${id}  z=${l.z} vis=${l.visible?'ja':'nein'} @(${l.bounds.x},${l.bounds.y}) ${l.bounds.w}×${l.bounds.h}`;
      }).join('\n') || '(keine)';
      OUT.elPre.textContent        = toJSON(DIAG.eventListeners);
      OUT.classesPre.textContent   = toJSON(DIAG.classes);
      OUT.signalsPre.textContent   = toJSON(DIAG.signals);
      OUT.hintsBox.innerHTML       = hints.map(h=>{
        const cls = h.type==='err' ? 'tests-err' : (h.type==='warn' ? 'tests-warn' : 'tests-ok');
        return `<div class="${cls}">• ${h.msg}</div>`;
      }).join('') || '<div class="tests-ok">Keine Auffälligkeiten.</div>';
    }

    if (verbose) console.info('[tests] diagnose', DIAG);
  }

  async function copyDiagnosis(){
    try{
      const txt = toJSON(window.__TESTS_DIAG__ || {});
      await navigator.clipboard.writeText(txt || '{}');
      console.info('[tests] Diagnose in Zwischenablage kopiert.');
    }catch(e){
      console.warn('[tests] Copy fehlgeschlagen', e);
    }
  }
  function exportDiagnosis(){
    const txt = toJSON(window.__TESTS_DIAG__ || {});
    const url = URL.createObjectURL(new Blob([txt],{type:'application/json'}));
    const a = Object.assign(document.createElement('a'), {href:url, download:'inspector-diagnose.json'});
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // --------------------------- [H] Tab-Setup -------------------------------
  window.registerInspectorTab('tests', function setup(section){
    injectCSS();
    render(section);
  });

})();
