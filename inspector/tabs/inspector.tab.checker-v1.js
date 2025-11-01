/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.checker-v1.js
 * Version : v25.11.01
 * Zweck   : CHECKER – Reihenfolgen-Checker für Skripte, Events, Abhängigkeiten
 * Features:
 *   • Script-Order-Check (harte & weiche Regeln) + Duplikate
 *   • Abhängigkeiten-Validierung (Inspector-Core → Tabs, Registry → Bridge, …)
 *   • Event-Timeline (Hook auf dispatchEvent für req:/cb:), kompakter Stream
 *   • Visualisierung: Inline-SVG Sequenz & Abhängigkeitsgraph (grün/gelb/rot)
 *   • Copy/Export der kompletten Diagnose
 * Abhäng. : window.registerInspectorTab(name, setup)
 * Hinweise:
 *   – Dispatch-Hook ist read-only und guarded (idempotent).
 *   – Regeln an dein Projekt anpassbar (RULZ unten).
 * ========================================================================== */
(function(){
  if (typeof window.registerInspectorTab !== 'function') {
    console.warn('[checker-tab] registerInspectorTab fehlt.');
    return;
  }

  /* ----------------------------- Inline CSS ------------------------------ */
  function injectCSS(){
    if (document.getElementById('insp-checker-inline-style')) return;
    const st = document.createElement('style');
    st.id='insp-checker-inline-style';
    st.textContent = `
#inspector .chk-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.25rem 0 .75rem}
#inspector .chk-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .chk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:.75rem}
#inspector .chk-card{border:1px solid #2a2a2e;border-radius:.6rem;padding:.6rem;background:#111}
#inspector .chk-card h4{margin:.1rem 0 .45rem}
#inspector .chk-pre{max-height:240px;overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.5rem;margin:0;white-space:pre}
#inspector .chk-badge{display:inline-block;border:1px solid #444;border-radius:.4rem;padding:.05rem .4rem;margin-left:.4rem;font-size:.85em;opacity:.85}
#inspector .ok{color:#8ab4f8} #inspector .warn{color:#ffcc00} #inspector .err{color:#ff6666}
#inspector .svg-wrap{overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.4rem}
#inspector .legend{font-size:.85em;opacity:.8}
    `;
    document.head.appendChild(st);
  }

  /* ------------------------------- Guards -------------------------------- */
  // Event-Dispatch-Hook (req:/cb:) – idempotent
  (function hookDispatch(){
    if (window.__CHK_DISPATCH_HOOKED__) return;
    window.__CHK_DISPATCH_HOOKED__ = true;

    const ET = window.EventTarget && window.EventTarget.prototype;
    if (!ET || !ET.dispatchEvent) return;
    const orig = ET.dispatchEvent;

    const log = window.__CHK_EVLOG__ = { list: [], cap: 300 };
    function push(name){
      const ts = new Date().toISOString().split('T').join(' ').replace('Z','');
      log.list.push({ ts, name });
      if (log.list.length > log.cap) log.list.splice(0, log.list.length - log.cap);
    }

    ET.dispatchEvent = function(evt){
      try{
        const n = evt && evt.type;
        if (typeof n==='string' && /^(cb:|req:)/.test(n)) push(n);
      }catch(_){}
      return orig.call(this, evt);
    };
  })();

  /* ----------------------------- Utilities ------------------------------- */
  const base = (url) => (url||'').split('?')[0].split('/').pop();
  const qver = (url) => {
    if (!url) return '';
    const q = url.split('?')[1] || '';
    const m = /(?:^|&)v=([^&]+)/i.exec(q);
    return m ? m[1] : '';
  };
  const toJSON = (o) => { try { return JSON.stringify(o, null, 2); } catch(e){ return String(e); } };

  function listScripts(){
    const arr = [...document.scripts].map((s,idx) => {
      const src = s.src || '';
      return {
        idx,
        src,
        file: base(src) || '(inline)',
        version: qver(src),
        async: !!s.async,
        defer: !!s.defer
      };
    });
    const counts = arr.reduce((m,a)=> (m[a.file]=(m[a.file]||0)+1, m), {});
    const dupes = Object.entries(counts).filter(([_,c])=>c>1).map(([file,count])=>({file,count}));
    return { list: arr, dupes };
  }

  function indexOfFile(scripts, pattern){
    // pattern: string oder regex
    for (const s of scripts){
      if (typeof pattern === 'string'){
        if (s.file === pattern || (s.src && s.src.includes(pattern))) return s.idx;
      } else if (pattern instanceof RegExp){
        if (pattern.test(s.file) || (s.src && pattern.test(s.src))) return s.idx;
      }
    }
    return -1;
  }

  /* -------------------------- Regel-Definitionen -------------------------- */
  // Harte Regeln (müssen erfüllt sein), Weiche Regeln (sollten)
  const RULZ = {
    hard: [
      // Inspector Core vor Tabs
      { id:'insp-core-before-tabs',
        desc:'Inspector Core MUSS vor allen Inspector-Tab-Skripten geladen werden.',
        must: (S) => {
          const core = indexOfFile(S, /ui-inspector-v1\.js$/);
          const anyTab = indexOfFile(S, /inspector\.tab\..*?\.js$/);
          return core >= 0 && (anyTab < 0 || core < anyTab);
        }
      },
      // Registry nach Assets
      { id:'registry-after-asset',
        desc:'registry.js MUSS nach asset.js geladen werden.',
        must: (S) => {
          const a = indexOfFile(S, /core\/asset\.js$/);
          const r = indexOfFile(S, /core\/registry\.js$/);
          return (a < 0 || r < 0) ? true : (a < r);
        }
      },
      // Bridge nach Registry/UIBuild (damit Snapshot schon gehen kann)
      { id:'bridge-after-registry',
        desc:'inspector.bridges.js MUSS nach registry/ui-build geladen werden.',
        must: (S) => {
          const br = indexOfFile(S, /inspector\.bridges\.js$/);
          const r  = indexOfFile(S, /core\/registry\.js$/);
          const ub = indexOfFile(S, /ui\/ui-build\.js$/);
          if (br < 0) return true; // keine Bridge → kein Fail
          const beforeR = (r >= 0 && br > r);
          const beforeU = (ub < 0) ? true : (br > ub);
          return beforeR && beforeU;
        }
      },
      // Boot vor game.bootstrap vor game.js
      { id:'boot-chain',
        desc:'boot.js → game.bootstrap.js → game.js (in dieser Reihenfolge).',
        must: (S) => {
          const boot = indexOfFile(S, /core\/boot\.js$/);
          const gb   = indexOfFile(S, /core\/game\.bootstrap\.js$/);
          const g    = indexOfFile(S, /core\/game\.js$/);
          if (boot<0 || gb<0 || g<0) return true; // fehlt → nicht hart failen
          return boot < gb && gb < g;
        }
      },
      // Layout zuletzt (nach Start)
      { id:'layout-lastish',
        desc:'ui-layout.js sollte am Ende der Kette liegen (nach Spielstart-Komponenten).',
        must: (S) => {
          const l = indexOfFile(S, /ui\/ui-layout\.js$/);
          if (l < 0) return true;
          const last = Math.max(...S.map(x=>x.idx));
          return (last - l) <= 2; // „nahe am Ende“
        }
      },
    ],
    soft: [
      // PathOverlay vor Bedienung
      { id:'pathoverlay-before-usage',
        desc:'path-overlay.js möglichst vor Benutzung (Bridge/Buttons) laden.',
        should: (S) => {
          const p  = indexOfFile(S, /core\/path-overlay\.js$/);
          const br = indexOfFile(S, /inspector\.bridges\.js$/);
          if (p<0 || br<0) return true;
          return p <= br;
        }
      },
      // Inspector Content vor Tabs (wenn genutzt)
      { id:'insp-content-before-tabs',
        desc:'ui-inspector.content-v1.js möglichst vor Tab-Skripten laden.',
        should: (S) => {
          const c = indexOfFile(S, /ui-inspector\.content-v1\.js$/);
          const t = indexOfFile(S, /inspector\.tab\..*?\.js$/);
          return (c < 0 || t < 0) ? true : (c < t);
        }
      },
    ]
  };

  /* --------------------------- Visualisierung ----------------------------- */
  function svgSequence(scripts, results){
    // horizontaler Zeitstrahl; rote Knoten bei harten Verstößen, gelb bei weichen
    const W = Math.max(680, scripts.length * 140);
    const H = 120;
    const pad = 20, xStep = (W - 2*pad) / Math.max(1, scripts.length-1);
    const nodes = scripts.map((s,i)=>({
      x: Math.round(pad + i*xStep),
      y: 60,
      label: s.file,
      cls: '' // später durch Ergebnisse
    }));

    // markiere Verstöße grob
    const hardFail = results.hard.filter(r=>!r.ok).length>0;
    const softWarn = results.soft.filter(r=>!r.ok).length>0;

    // Per-Regel nicht trivial einem Node zuordnen → globale Ampel:
    const banner = hardFail ? 'err' : (softWarn ? 'warn' : 'ok');

    const esc = s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');

    let circles = '';
    let labels  = '';
    nodes.forEach((n,i)=>{
      const c = hardFail ? '#ff6666' : (softWarn ? '#ffcc00' : '#8ab4f8');
      circles += `<circle cx="${n.x}" cy="${n.y}" r="8" fill="${c}" />`;
      labels  += `<text x="${n.x}" y="${n.y+28}" font-size="10" text-anchor="middle" fill="#ddd">${esc(n.label)}</text>`;
    });
    let lines = '';
    nodes.forEach((n,i)=>{ if (i>0) lines += `<line x1="${nodes[i-1].x}" y1="${nodes[i-1].y}" x2="${n.x}" y2="${n.y}" stroke="#444" />`; });

    return `
<div class="svg-wrap">
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Script-Sequenz">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#0f1013" stroke="#222"/>
  ${lines}
  ${circles}
  ${labels}
  <text x="${W-12}" y="14" font-size="11" text-anchor="end" fill="${banner==='err'?'#ff6666':(banner==='warn'?'#ffcc00':'#8ab4f8')}">
    ${banner==='err'?'HARTE VERSTÖSSE':(banner==='warn'?'Hinweise':'OK')}
  </text>
</svg>
<div class="legend">• Blau: ok · Gelb: weiche Regel verletzt · Rot: harte Regel verletzt</div>
</div>
`;
  }

  function svgDeps(results){
    // Mini-Abhängigkeitsgraph (feste Regeln → Pfeile)
    const edges = [
      { from:'asset.js', to:'registry.js', hard: true },
      { from:'ui-inspector-v1.js', to:'inspector.tab.*.js', hard: true },
      { from:'registry/ui-build', to:'inspector.bridges.js', hard: true },
      { from:'boot.js', to:'game.bootstrap.js', hard: true },
      { from:'game.bootstrap.js', to:'game.js', hard: true },
      { from:'(Spielteile)', to:'ui-layout.js', hard: false },
    ];
    const W=680, H=180; const col1=150,col2=360,col3=560;
    const rows = [
      { y:40,  nodes:['asset.js','ui-inspector-v1.js','boot.js'] },
      { y:90,  nodes:['registry.js','ui-inspector.content-v1.js','game.bootstrap.js'] },
      { y:140, nodes:['inspector.tab.*.js','inspector.bridges.js','game.js','ui-layout.js'] },
    ];
    const pos = {};
    rows.forEach(row=>{
      row.nodes.forEach((name, i)=>{
        const x = [col1,col2,col3, col3+90][i] || (col1+i*180);
        pos[name] = { x, y: row.y };
      });
    });
    function okEdge(e){
      // benutze Ergebnisse: wenn harte Regel insp-core-before-tabs failt → einfärben
      const hardFail = results.hard.filter(r=>!r.ok).map(r=>r.id);
      if (e.hard){
        if (e.from==='ui-inspector-v1.js' && hardFail.includes('insp-core-before-tabs')) return false;
        if (e.from==='asset.js' && hardFail.includes('registry-after-asset')) return false;
        if (e.from==='boot.js' && hardFail.includes('boot-chain')) return false;
        if (e.from==='game.bootstrap.js' && hardFail.includes('boot-chain')) return false;
        if (e.from==='registry/ui-build' && hardFail.includes('bridge-after-registry')) return false;
      }else{
        const softFail = results.soft.filter(r=>!r.ok).map(r=>r.id);
        if (e.to==='ui-layout.js' && softFail.includes('pathoverlay-before-usage')) return true; // unrelated
      }
      return true;
    }
    let svg = `<div class="svg-wrap"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    // nodes
    Object.entries(pos).forEach(([name,p])=>{
      svg += `<rect x="${p.x-70}" y="${p.y-15}" width="140" height="30" rx="6" ry="6" fill="#1a1d22" stroke="#333"/>`;
      svg += `<text x="${p.x}" y="${p.y+4}" font-size="11" text-anchor="middle" fill="#ddd">${name}</text>`;
    });
    // edges
    edges.forEach(e=>{
      const a = pos[e.from], b = pos[e.to]; if (!a||!b) return;
      const ok = okEdge(e);
      const col = ok ? (e.hard?'#8ab4f8':'#ffcc00') : '#ff6666';
      svg += `<defs><marker id="arr${e.from.replace(/\W/g,'')}_${e.to.replace(/\W/g,'')}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${col}"/></marker></defs>`;
      svg += `<line x1="${a.x+70}" y1="${a.y}" x2="${b.x-70}" y2="${b.y}" stroke="${col}" stroke-width="2" marker-end="url(#arr${e.from.replace(/\W/g,'')}_${e.to.replace(/\W/g,'')})"/>`;
    });
    svg += `</svg><div class="legend">Kanten: Blau=harte OK · Gelb=weiche Empfehlung · Rot=harte Verletzung</div></div>`;
    return svg;
  }

  /* --------------------------- Diagnose & Regeln --------------------------- */
  function runRules(scriptsArr){
    const hard = RULZ.hard.map(r=>({ id:r.id, desc:r.desc, ok: !!r.must(scriptsArr) }));
    const soft = RULZ.soft.map(r=>({ id:r.id, desc:r.desc, ok: !!r.should(scriptsArr) }));
    return { hard, soft };
  }

  function buildHints(ruleRes, dupes){
    const hints = [];
    const hardBad = ruleRes.hard.filter(r=>!r.ok);
    const softBad = ruleRes.soft.filter(r=>!r.ok);
    if (dupes.length) hints.push({type:'warn', msg:`${dupes.length} doppelte Script-Datei(en) gefunden`});
    for (const r of hardBad) hints.push({type:'err',  msg:r.desc});
    for (const r of softBad) hints.push({type:'warn', msg:r.desc});
    if (!hints.length) hints.push({type:'ok', msg:'Alles in Ordnung – Reihenfolge konsistent.'});
    return hints;
  }

  /* --------------------------------- UI ----------------------------------- */
  function el(tag, cls, txt){ const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; }

  function render(section){
    section.innerHTML = '<h2>Checker</h2>';
    const tb = el('div','chk-toolbar');
    const bScan   = el('button','chk-btn','Scan');
    const bCopy   = el('button','chk-btn','Copy JSON');
    const bExport = el('button','chk-btn','Export JSON');
    const bClear  = el('button','chk-btn','Timeline leeren');
    tb.append(bScan,bCopy,bExport,bClear);
    section.append(tb);

    const grid = el('div','chk-grid'); section.append(grid);

    const cSeq = el('div','chk-card'); cSeq.innerHTML = `<h4>Script-Sequenz</h4><div id="chk-seq"></div>`; grid.append(cSeq);
    const cDep = el('div','chk-card'); cDep.innerHTML = `<h4>Abhängigkeiten</h4><div id="chk-deps"></div>`; grid.append(cDep);
    const cRule= el('div','chk-card'); cRule.innerHTML= `<h4>Regeln</h4><pre class="chk-pre" id="chk-rules"></pre>`; grid.append(cRule);
    const cDup = el('div','chk-card'); cDup.innerHTML = `<h4>Duplikate</h4><pre class="chk-pre" id="chk-dupes"></pre>`; grid.append(cDup);
    const cEvt = el('div','chk-card'); cEvt.innerHTML = `<h4>Event-Timeline <span class="chk-badge" id="chk-evt-count">0</span></h4><pre class="chk-pre" id="chk-evt"></pre>`; grid.append(cEvt);
    const cHint= el('div','chk-card'); cHint.innerHTML= `<h4>Hinweise</h4><div id="chk-hints"></div>`; grid.append(cHint);

    const OUT = {
      seq: document.getElementById('chk-seq'),
      deps: document.getElementById('chk-deps'),
      rules: document.getElementById('chk-rules'),
      dupes: document.getElementById('chk-dupes'),
      evt: document.getElementById('chk-evt'),
      evtCount: document.getElementById('chk-evt-count'),
      hints: document.getElementById('chk-hints')
    };

    async function doScan(){
      const S = listScripts();
      const scriptsArr = S.list;
      const rules = runRules(scriptsArr);
      const hints = buildHints(rules, S.dupes);
      const evlog = (window.__CHK_EVLOG__ && window.__CHK_EVLOG__.list) || [];

      // Visuals
      OUT.seq.innerHTML  = svgSequence(scriptsArr, rules);
      OUT.deps.innerHTML = svgDeps(rules);

      // Text
      OUT.rules.textContent = toJSON(rules);
      OUT.dupes.textContent = S.dupes.length ? S.dupes.map(d=>`${d.file} × ${d.count}`).join('\n') : '(keine)';
      OUT.evt.textContent   = evlog.slice(-120).map(e=>`${e.ts}  ${e.name}`).join('\n') || '(leer)';
      OUT.evtCount.textContent = String(evlog.length);

      OUT.hints.innerHTML = hints.map(h=>{
        const cls = h.type==='err'?'err':(h.type==='warn'?'warn':'ok');
        return `<div class="${cls}">• ${h.msg}</div>`;
      }).join('');
      // Diagnose global ablegen
      window.__CHECKER_DIAG__ = {
        ts: new Date().toISOString(),
        scripts: scriptsArr,
        rules,
        dupes: S.dupes,
        events: evlog,
        hints
      };
    }

    bScan.onclick   = doScan;
    bCopy.onclick   = async()=> {
      try{
        const txt = toJSON(window.__CHECKER_DIAG__ || {});
        await navigator.clipboard.writeText(txt || '{}');
        console.info('[checker] Diagnose in Zwischenablage kopiert.');
      }catch(e){ console.warn('[checker] Copy fehlgeschlagen', e); }
    };
    bExport.onclick = ()=> {
      const txt = toJSON(window.__CHECKER_DIAG__ || {});
      const url = URL.createObjectURL(new Blob([txt],{type:'application/json'}));
      const a = Object.assign(document.createElement('a'), {href:url, download:'inspector-checker.json'});
      document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };
    bClear.onclick  = ()=> { if (window.__CHK_EVLOG__) window.__CHK_EVLOG__.list.length = 0; doScan(); };

    // Initialer Scan
    doScan();

    // Bei Tab-Aktivierung aktualisieren
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if (e?.detail?.tab === 'checker') doScan();
    });
  }

  /* -------------------------- Tab registrieren ---------------------------- */
  window.registerInspectorTab('checker', function setup(section){
    injectCSS();
    render(section);
  });

})();
