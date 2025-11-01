/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.tests-v1.js
 * Version : v25.11.01-final
 * Zweck   : TESTS – Diagnose & Werkzeuge
 * Features:
 *   • Script-Scanner: alle <script>, Duplikate, Version-Query, async/defer
 *   • Quick-Events: Inspector open/close/toggle, Build/Res-Snapshots, Path-Overlay
 *   • Globals-Check: Inspector/Registry/UIBuild/PathOverlay/Bridge-Hooks
 *   • UI-Layer-Scan: wichtige Container (Canvas, HUD, BuildDock, Inspector, …)
 *   • Layer-Highlight: sichtbares Overlay mit Bounds, z-index, id
 *   • Copy/Export: Diagnose als JSON kopieren oder downloaden
 * Abhäng. : window.registerInspectorTab(name, setup)
 * Hinweis : rein lesend, verändert keine Spielzustände (außer bei Test-Events)
 * ========================================================================== */
(function(){
  if (typeof window.registerInspectorTab !== 'function') {
    console.warn('[tests-tab] registerInspectorTab fehlt.');
    return;
  }

  // ----------------------------- [Inline CSS] -------------------------------
  function injectCSS(){
    if (document.getElementById('insp-tests-inline-style')) return;
    const st = document.createElement('style');
    st.id = 'insp-tests-inline-style';
    st.textContent = `
#inspector .tests-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.25rem 0 .75rem}
#inspector .tests-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .tests-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.75rem}
#inspector .tests-card{border:1px solid #2a2a2e;border-radius:.6rem;padding:.6rem;background:#111}
#inspector .tests-card h4{margin:.1rem 0 .45rem}
#inspector .tests-pre{max-height:220px;overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.5rem;margin:0}
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

  // ------------------------------- [State] ---------------------------------
  const S = {
    section: null,
    out: null,
    lastDiag: null,
    layerMarks: [],
    layerOn: false
  };

  // ---------------------------- [Utilities] --------------------------------
  const base = (url) => (url||'').split('?')[0].split('/').pop();
  const qver = (url) => {
    if (!url) return '';
    const q = url.split('?')[1] || '';
    const m = /(?:^|&)v=([^&]+)/i.exec(q);
    return m ? m[1] : '';
  };
  const toJSON = (o) => { try { return JSON.stringify(o, null, 2); } catch(e){ return String(e); } };
  const num = (v, d=0) => (typeof v==='number' ? v.toFixed(d) : v);

  // -------------------------- [Collectors] ---------------------------------
  function collectScripts(){
    const arr = [...document.scripts].map(s => {
      const src = s.src || '';
      return {
        src,
        file: base(src),
        version: qver(src),
        async: !!s.async,
        defer: !!s.defer,
        type: s.type || 'text/javascript'
      };
    });
    const counts = arr.reduce((m,a)=> (m[a.file]=(m[a.file]||0)+1, m), {});
    const duplicates = Object.entries(counts)
      .filter(([_,c])=>c>1)
      .map(([file,c])=>({file, count:c}));
    return { scripts: arr, duplicates };
  }

  function collectGlobals(){
    return {
      inspector: !!window.Inspector,
      inspectorContent: !!window.InspectorContent,
      registerInspectorTab: typeof window.registerInspectorTab === 'function',
      registry: !!window.Registry,
      uiBuild: !!window.UIBuild,
      pathOverlay: !!window.PathOverlay,
      bridge_v120: !!window.__INSPECTOR_BRIDGE_V120__,
      console_hooked: !!window.__INSPECTOR_CONSOLE_HOOKED__
    };
  }

  function collectLayers(){
    const pick = [
      '#game', '#game-canvas',  // Canvas-IDs
      '#ui-root', '#hud-root', '#build-dock', '#inspector', '#inspector-fab',
      '[data-ui="canvas"]','[data-ui="root"]','[data-ui="hud"]','[data-ui="build"]'
    ];
    const seen = new Set();
    const nodes = [];
    for (const sel of pick){
      document.querySelectorAll(sel).forEach(el=>{
        if (!el || seen.has(el)) return;
        seen.add(el);
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        nodes.push({
          sel,
          id: el.id || null,
          tag: el.tagName.toLowerCase(),
          visible: !!(r.width && r.height && cs.visibility!=='hidden' && cs.display!=='none'),
          z: cs.zIndex || 'auto',
          opacity: cs.opacity,
          bounds: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
        });
      });
    }
    return nodes;
  }

  function makeDiagnosis(){
    const scripts = collectScripts();
    const globals = collectGlobals();
    const layers  = collectLayers();
    return {
      ts: new Date().toISOString(),
      globals,
      scripts,
      layers,
      hints: buildHints(globals, scripts, layers)
    };
  }

  function buildHints(globals, scripts, layers){
    const tips = [];
    if (scripts.duplicates.length){
      tips.push({type:'warn', msg:`${scripts.duplicates.length} doppelte Script-Datei(en) gefunden`});
    }
    if (!globals.registerInspectorTab){
      tips.push({type:'err', msg:`registerInspectorTab fehlt → Tabs werden nicht gerendert`});
    }
    const insp = layers.find(l => l.id === 'inspector');
    const fab  = layers.find(l => l.id === 'inspector-fab');
    if (insp && fab && fab.visible && insp.visible){
      // ok
    } else {
      tips.push({type:'warn', msg:`Inspector oder FAB evtl. nicht sichtbar/überdeckt`});
    }
    return tips;
  }

  // ------------------------ [Layer Highlight] ------------------------------
  function clearLayerMarks(){
    S.layerMarks.forEach(n => n.remove());
    S.layerMarks.length = 0;
  }
  function markNode(bounds, label){
    const b = document.createElement('div');
    b.className = 'tests-layer-outline';
    b.style.left = bounds.x + 'px';
    b.style.top  = bounds.y + 'px';
    b.style.width  = Math.max(1, bounds.w) + 'px';
    b.style.height = Math.max(1, bounds.h) + 'px';

    const lab = document.createElement('div');
    lab.className = 'tests-layer-label';
    lab.style.left = (bounds.x + 2) + 'px';
    lab.style.top  = (bounds.y - 20) + 'px';
    lab.textContent = label;

    document.body.append(b, lab);
    S.layerMarks.push(b, lab);
  }
  function toggleLayerMarks(on){
    S.layerOn = on ?? !S.layerOn;
    clearLayerMarks();
    if (!S.layerOn) return;
    // markierte Layer erneut berechnen
    const nodes = collectLayers();
    nodes.forEach(n=>{
      if (!n.visible) return;
      const lbl = `${n.id ? '#'+n.id : n.tag}${n.z!=='auto' ? ' z='+n.z : ''} ${n.bounds.w}×${n.bounds.h}`;
      markNode(n.bounds, lbl);
    });
  }

  // ----------------------------- [UI] --------------------------------------
  function el(tag, cls, txt){ const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; }

  function render(section){
    section.innerHTML = '<h2>Tests</h2>';

    // Toolbar
    const tb = el('div','tests-toolbar');
    const bOpen   = el('button','tests-btn','Open');
    const bClose  = el('button','tests-btn','Close');
    const bToggle = el('button','tests-btn','Toggle');
    const bBuild  = el('button','tests-btn','Build Snapshot');
    const bRes    = el('button','tests-btn','Res Snapshot');
    const bPaths  = el('button','tests-btn','Path Overlay');
    const bHeat   = el('button','tests-btn','Heatmap');
    const bScan   = el('button','tests-btn','Scan');
    const bCopy   = el('button','tests-btn','Copy JSON');
    const bExport = el('button','tests-btn','Export JSON');
    const bLayer  = el('button','tests-btn','Layer markieren');

    tb.append(bOpen,bClose,bToggle,bBuild,bRes,bPaths,bHeat,bScan,bCopy,bExport,bLayer);
    section.append(tb);

    // Cards Grid
    const grid = el('div','tests-grid');
    section.append(grid);

    // Card: Globals
    const c1 = el('div','tests-card');
    c1.innerHTML = `<h4>Globals</h4><div class="tests-kv" id="tests-globals"></div>`;
    grid.append(c1);

    // Card: Scripts
    const c2 = el('div','tests-card');
    c2.innerHTML = `<h4>Scripts <span class="tests-badge" id="tests-scripts-count">0</span></h4>
                    <pre class="tests-pre" id="tests-scripts-pre"></pre>`;
    grid.append(c2);

    // Card: Duplicates
    const c3 = el('div','tests-card');
    c3.innerHTML = `<h4>Duplikate</h4><pre class="tests-pre" id="tests-dupes-pre">(keine)</pre>`;
    grid.append(c3);

    // Card: Layers
    const c4 = el('div','tests-card');
    c4.innerHTML = `<h4>Layers</h4><pre class="tests-pre" id="tests-layers-pre"></pre>`;
    grid.append(c4);

    // Card: Hints
    const c5 = el('div','tests-card');
    c5.innerHTML = `<h4>Hinweise</h4><div id="tests-hints"></div>`;
    grid.append(c5);

    // Output cache
    S.section = section;
    S.out = {
      globals: document.getElementById('tests-globals'),
      scriptsCount: document.getElementById('tests-scripts-count'),
      scriptsPre: document.getElementById('tests-scripts-pre'),
      dupesPre: document.getElementById('tests-dupes-pre'),
      layersPre: document.getElementById('tests-layers-pre'),
      hintsBox: document.getElementById('tests-hints')
    };

    // Bind buttons
    bOpen.onclick   = ()=> window.dispatchEvent(new CustomEvent('req:insp:open'));
    bClose.onclick  = ()=> window.dispatchEvent(new CustomEvent('req:insp:close'));
    bToggle.onclick = ()=> window.Inspector?.toggle?.();

    bBuild.onclick  = ()=> window.dispatchEvent(new CustomEvent('req:build:snapshot'));
    bRes.onclick    = ()=> window.dispatchEvent(new CustomEvent('req:res:snapshot'));

    bPaths.onclick  = ()=> {
      const flag = !window.__TESTS_PATH_OVERLAY__;
      window.__TESTS_PATH_OVERLAY__ = flag;
      window.dispatchEvent(new CustomEvent(flag ? 'cb:path:overlay:on' : 'cb:path:overlay:off'));
      bPaths.textContent = flag ? 'Path Overlay (aus)' : 'Path Overlay (an)';
    };
    bHeat.onclick   = ()=> {
      const flag = !window.__TESTS_PATH_HEAT__;
      window.__TESTS_PATH_HEAT__ = flag;
      window.dispatchEvent(new CustomEvent(flag ? 'cb:path:heatmap:on' : 'cb:path:heatmap:off'));
      bHeat.textContent = flag ? 'Heatmap (aus)' : 'Heatmap (an)';
    };

    bScan.onclick   = ()=> updateDiagnosis(true);
    bCopy.onclick   = ()=> copyDiagnosis();
    bExport.onclick = ()=> exportDiagnosis();
    bLayer.onclick  = ()=> toggleLayerMarks();

    // Initial scan
    updateDiagnosis(false);
  }

  // ----------------------- [Render Diagnosis] ------------------------------
  function updateDiagnosis(verbose){
    const diag = makeDiagnosis();
    S.lastDiag = diag;

    // globals
    const g = diag.globals;
    S.out.globals.innerHTML = `
      <div><b>Inspector</b>: ${g.inspector ? 'ja' : '<span class="tests-warn">nein</span>'}</div>
      <div><b>registerInspectorTab</b>: ${g.registerInspectorTab ? 'ja' : '<span class="tests-err">nein</span>'}</div>
      <div><b>Registry</b>: ${g.registry ? 'ja' : 'nein'}</div>
      <div><b>UIBuild</b>: ${g.uiBuild ? 'ja' : 'nein'}</div>
      <div><b>PathOverlay</b>: ${g.pathOverlay ? 'ja' : 'nein'}</div>
      <div><b>Bridge v1.2.0</b>: ${g.bridge_v120 ? 'ja' : 'nein'}</div>
      <div><b>Console Hook</b>: ${g.console_hooked ? 'ja' : 'nein'}</div>
    `;

    // scripts
    const sc = diag.scripts;
    S.out.scriptsCount.textContent = String(sc.scripts.length);
    const lines = sc.scripts.map(s => {
      const flags = [
        s.async ? 'async' : '',
        s.defer ? 'defer' : '',
        s.version ? ('v='+s.version) : ''
      ].filter(Boolean).join(' ');
      return `${s.file}${flags?('  ['+flags+']'):''}`;
    });
    S.out.scriptsPre.textContent = (lines.join('\n') || '(keine)');

    // duplicates
    S.out.dupesPre.textContent = (sc.duplicates.length
      ? sc.duplicates.map(d=>`${d.file} × ${d.count}`).join('\n')
      : '(keine)');

    // layers
    const lay = diag.layers;
    const llines = lay.map(l => {
      const id = l.id ? '#'+l.id : l.tag;
      return `${id}  z=${l.z}  vis=${l.visible?'ja':'nein'}  @(${l.bounds.x},${l.bounds.y})  ${l.bounds.w}×${l.bounds.h}`;
    }).join('\n');
    S.out.layersPre.textContent = (llines || '(keine)');

    // hints
    S.out.hintsBox.innerHTML = diag.hints.map(h=>{
      const cls = h.type==='err' ? 'tests-err' : (h.type==='warn' ? 'tests-warn' : 'tests-ok');
      return `<div class="${cls}">• ${h.msg}</div>`;
    }).join('') || '<div class="tests-ok">Keine Auffälligkeiten.</div>';

    if (verbose) console.info('[tests] diagnose', diag);
  }

  async function copyDiagnosis(){
    try{
      const txt = toJSON(S.lastDiag || makeDiagnosis());
      await navigator.clipboard.writeText(txt);
      console.info('[tests] Diagnose in Zwischenablage kopiert.');
    }catch(e){
      console.warn('[tests] Copy fehlgeschlagen', e);
    }
  }

  function exportDiagnosis(){
    const txt = toJSON(S.lastDiag || makeDiagnosis());
    const url = URL.createObjectURL(new Blob([txt],{type:'application/json'}));
    const a = Object.assign(document.createElement('a'), {href:url, download:'inspector-diagnose.json'});
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // ------------------------- [Tab-Registration] ----------------------------
  window.registerInspectorTab('tests', function setup(section){
    injectCSS();
    render(section);

    // Bei Tab-Wechsel optional auto-scan
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if (e?.detail?.tab === 'tests') updateDiagnosis(false);
    });
  });

})();
