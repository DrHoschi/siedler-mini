/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.checker-v1.js
 * Projekt : Neue Siedler
 * Version : v25.11.07-final
 * Zweck   : CHECKER – Reihenfolgen-Checker für Skripte, Events, Abhängigkeiten
 *
 * Features
 * - Script-Order-Check (harte/weiche Regeln) + Duplikate
 * - Abhängigkeiten-Validierung + Mini-Graph (SVG)
 * - Event-Timeline (Hook auf dispatchEvent für req:/cb:)
 * - Event-Listener-Zähler (Hook auf add/removeEventListener)
 * - Klassen-Scanner (globale Klassen/Konstruktoren, Vererbung, Methoden)
 * - Copy/Export der kompletten Diagnose (JSON)
 *
 * API     : window.registerInspectorTab(name, setup, { id, order, icon? })
 * Guards  : __INSP_TABS__['tab:checker@v1'], __CHK_DISPATCH_HOOKED__, __CHK_LISTENER_HOOKED__
 * Output  : window.__CHECKER_DIAG__ (letztes Ergebnis)
 * ========================================================================== */
(function () {
  'use strict';

  /* ============================== Run-Once ================================= */
  window.__INSP_TABS__ = window.__INSP_TABS__ || {};
  if (window.__INSP_TABS__['tab:checker@v1']) {
    (console.info || console.log)('[checker-tab] already loaded');
    return;
  }
  window.__INSP_TABS__['tab:checker@v1'] = true;

  /* ============================== Late-Register ============================ *
   * Registriert den Tab, sobald die Inspector-API verfügbar ist. Fällt nach
   * 10s auf einen minimalen DOM-Fallback zurück (wenn .insp-tabs/.insp-content existieren).
   * ======================================================================== */
  function universalRegister(tabTitle, tabId, mountFn, order, icon) {
    const tryAPI = () => {
      if (typeof window.registerInspectorTab === 'function') {
        window.registerInspectorTab(tabTitle, mountFn, { id: tabId, order: order || 130, icon });
        (window.CBLog?.info || console.info)('[checker-tab] via API registriert.');
        return true;
      }
      return false;
    };
    if (tryAPI()) return;

    const onReady = () => { if (tryAPI()) cleanup(); };
    const cleanup = () => {
      window.removeEventListener('cb:insp:core:ready', onReady);
      window.removeEventListener('cb:insp:content:ready', onReady);
      clearInterval(poll); clearTimeout(tout);
    };
    window.addEventListener('cb:insp:core:ready', onReady);
    window.addEventListener('cb:insp:content:ready', onReady);
    const poll = setInterval(onReady, 200);
    const tout = setTimeout(() => {
      clearInterval(poll);
      // --- Minimaler DOM-Fallback ---
      const insp = document.querySelector('#inspector');
      const tabs = insp?.querySelector('.insp-tabs');
      const content = insp?.querySelector('.insp-content');
      if (tabs && content) {
        const btn = document.createElement('button');
        btn.textContent = tabTitle; btn.dataset.tab = tabId;
        if (icon) btn.style.setProperty('--insp-tab-icon', `url(${icon})`);
        tabs.appendChild(btn);

        const sec = document.createElement('section');
        sec.id = tabId; content.appendChild(sec);

        tabs.querySelectorAll('button').forEach(b => {
          b.addEventListener('click', () => {
            const id = b.dataset.tab;
            content.querySelectorAll('section').forEach(s => s.style.display = (s.id === id ? 'block' : 'none'));
            window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail: { tab: b.textContent } }));
          });
        });

        mountFn(sec); sec.style.display = 'block';
        console.info('[checker-tab] DOM-Fallback aktiv.');
      } else {
        console.warn('[checker-tab] Weder API noch .insp-tabs/.insp-content vorhanden.');
      }
    }, 10000);
  }

  /* ================================= CSS =================================== */
  function injectCSS() {
    if (document.getElementById('insp-checker-inline-style')) return;
    const st = document.createElement('style');
    st.id = 'insp-checker-inline-style';
    st.textContent = `
#inspector .chk-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.25rem 0 .75rem}
#inspector .chk-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .chk-input{padding:.25rem .5rem;border:1px solid #333;background:#111;border-radius:.4rem;min-width:220px}
#inspector .chk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:.75rem}
#inspector .chk-card{border:1px solid #2a2a2e;border-radius:.6rem;padding:.6rem;background:#111}
#inspector .chk-card h4{margin:.1rem 0 .45rem}
#inspector .chk-pre{max-height:260px;overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.5rem;margin:0;white-space:pre}
#inspector .chk-badge{display:inline-block;border:1px solid #444;border-radius:.4rem;padding:.05rem .4rem;margin-left:.4rem;font-size:.85em;opacity:.85}
#inspector .ok{color:#8ab4f8} #inspector .warn{color:#ffcc00} #inspector .err{color:#ff6666}
#inspector .svg-wrap{overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.4rem}
#inspector .legend{font-size:.85em;opacity:.8}
    `;
    document.head.appendChild(st);
  }

  /* =============================== Hooks =================================== */
  // 1) Event-Dispatch-Timeline (req:/cb:)
  (function hookDispatch(){
    if (window.__CHK_DISPATCH_HOOKED__) return;
    window.__CHK_DISPATCH_HOOKED__ = true;

    const ET = window.EventTarget && window.EventTarget.prototype;
    if (!ET || !ET.dispatchEvent) return;
    const orig = ET.dispatchEvent;

    const log = window.__CHK_EVLOG__ = { list: [], cap: 600 };
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

  // 2) Event-Listener-Zähler (add/removeEventListener)
  (function hookAddRemove(){
    if (window.__CHK_LISTENER_HOOKED__) return;
    window.__CHK_LISTENER_HOOKED__ = true;

    const ET = window.EventTarget && window.EventTarget.prototype;
    if (!ET || !ET.addEventListener || !ET.removeEventListener) return;

    const origAdd = ET.addEventListener;
    const origRem = ET.removeEventListener;

    const mapPerTarget = new WeakMap();   // target -> Map(type -> count)
    const totals = Object.create(null);   // { type: totalCount }
    const totalsByTarget = new WeakMap(); // target -> totalCount
    const track = window.__CHK_LISTENER__ = { totals, mapPerTarget, totalsByTarget };

    function inc(target, type){
      const m = mapPerTarget.get(target) || new Map();
      m.set(type, (m.get(type)||0)+1);
      mapPerTarget.set(target, m);
      totals[type] = (totals[type]||0)+1;
      totalsByTarget.set(target, (totalsByTarget.get(target)||0)+1);
    }
    function dec(target, type){
      const m = mapPerTarget.get(target); if (!m) return;
      const v = (m.get(type)||0)-1;
      if (v>0) m.set(type, v); else m.delete(type);
      if (!m.size) mapPerTarget.delete(target);
      if (totals[type]) totals[type]--;
      totalsByTarget.set(target, Math.max(0,(totalsByTarget.get(target)||1)-1));
    }

    ET.addEventListener = function(type, listener, options){
      try{ if (type) inc(this, String(type)); }catch(_){}
      return origAdd.call(this, type, listener, options);
    };
    ET.removeEventListener = function(type, listener, options){
      try{ if (type) dec(this, String(type)); }catch(_){}
      return origRem.call(this, type, listener, options);
    };
  })();

  /* ================================ Utils ================================== */
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
    for (const s of scripts){
      if (typeof pattern === 'string'){
        if (s.file === pattern || (s.src && s.src.includes(pattern))) return s.idx;
      } else if (pattern instanceof RegExp){
        if (pattern.test(s.file) || (s.src && pattern.test(s.src))) return s.idx;
      }
    }
    return -1;
  }

  /* =========================== Regeln & Graphen ============================ */
  // --- RULZ: HART + WEICH -----------------------------------------------------
const RULZ = {
  hard: [
    { id:'insp-core-before-tabs',
      desc:'Inspector Core MUSS vor allen Inspector-Tab-Skripten geladen werden.',
      must: (S) => {
        const core = indexOfFile(S, /ui-inspector-v1\.js$/);
        const anyTab = indexOfFile(S, /inspector\.tab\..*?\.js$/);
        return core >= 0 && (anyTab < 0 || core < anyTab);
      }
    },
    { id:'registry-after-asset',
      desc:'registry.js MUSS nach asset.js geladen werden.',
      must: (S) => {
        const a = indexOfFile(S, /core\/asset\.js$/);
        const r = indexOfFile(S, /core\/registry\.js$/);
        return (a < 0 || r < 0) ? true : (a < r);
      }
    },
    { id:'bridge-after-registry',
      desc:'inspector.bridges.js MUSS nach registry/ui-build geladen werden.',
      must: (S) => {
        const br = indexOfFile(S, /inspector\.bridges\.js$/);
        const r  = indexOfFile(S, /core\/registry\.js$/);
        const ub = indexOfFile(S, /ui\/ui-build\.js$/);
        if (br < 0) return true;
        const afterR = (r >= 0 ? br > r : true);
        const afterU = (ub >= 0 ? br > ub : true);
        return afterR && afterU;
      }
    },
    // ⬇️ wieder aktiv: Boot-Kette
    { id:'boot-chain',
      desc:'boot.js → game.bootstrap.js → game.js (in dieser Reihenfolge).',
      must: (S) => {
        const boot = indexOfFile(S, /core\/boot(?:-v1)?\.js$/);
        const gb   = indexOfFile(S, /core\/game\.bootstrap\.js$/);
        const g    = indexOfFile(S, /core\/game\.js$/);
        if (boot<0 || gb<0 || g<0) return true; // wenn Teile fehlen, kein Hard-Fail
        return boot < gb && gb < g;
      }
    },
  ],
  soft: [
    // ⬇️ wieder aktiv: Content vor Tabs
    { id:'insp-content-before-tabs',
      desc:'ui-inspector.content-v1.js möglichst vor Tab-Skripten laden.',
      should: (S) => {
        const c = indexOfFile(S, /ui-inspector\.content-v1\.js$/);
        const t = indexOfFile(S, /inspector\.tab\..*?\.js$/);
        return (c < 0 || t < 0) ? true : (c < t);
      }
    },
    // ⬇️ wieder aktiv: Layout möglichst zuletzt
    { id:'layout-lastish',
      desc:'ui-layout.js sollte am Ende liegen (nach Start-/HUD-Komponenten).',
      should: (S) => {
        const l = indexOfFile(S, /ui\/ui-layout\.js$/);
        if (l < 0) return true;
        const last = Math.max(...S.map(x=>x.idx));
        return (last - l) <= 2;
      }
    },
    // ⬇️ optional: Path-Overlay vor Bridges benutzen
    { id:'pathoverlay-before-usage',
      desc:'core/path-overlay.js möglichst vor Bridges/Toggles laden.',
      should: (S) => {
        const p  = indexOfFile(S, /core\/path-overlay\.js$/);
        const br = indexOfFile(S, /inspector\.bridges\.js$/);
        if (p<0 || br<0) return true;
        return p <= br;
      }
    },
  ]
};
  function svgSequence(scripts, results){
    const W = Math.max(680, scripts.length * 140);
    const H = 120;
    const pad = 20, xStep = (W - 2*pad) / Math.max(1, scripts.length-1);
    const nodes = scripts.map((s,i)=>({ x: Math.round(pad + i*xStep), y: 60, label: s.file }));

    const hardFail = results.hard.some(r=>!r.ok);
    const softWarn = results.soft.some(r=>!r.ok);
    const banner = hardFail ? 'err' : (softWarn ? 'warn' : 'ok');
    const esc = s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');

    let circles = '', labels  = '', lines = '';
    nodes.forEach((n,i)=>{
      const c = hardFail ? '#ff6666' : (softWarn ? '#ffcc00' : '#8ab4f8');
      circles += `<circle cx="${n.x}" cy="${n.y}" r="8" fill="${c}" />`;
      labels  += `<text x="${n.x}" y="${n.y+28}" font-size="10" text-anchor="middle" fill="#ddd">${esc(n.label)}</text>`;
      if (i>0) lines += `<line x1="${nodes[i-1].x}" y1="${nodes[i-1].y}" x2="${n.x}" y2="${n.y}" stroke="#444" />`;
    });

    return `
<div class="svg-wrap">
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Script-Sequenz">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#0f1013" stroke="#222"/>
  ${lines}${circles}${labels}
  <text x="${W-12}" y="14" font-size="11" text-anchor="end" fill="${banner==='err'?'#ff6666':(banner==='warn'?'#ffcc00':'#8ab4f8')}">
    ${banner==='err'?'HARTE VERSTÖSSE':(banner==='warn'?'Hinweise':'OK')}
  </text>
</svg>
<div class="legend">• Blau: ok · Gelb: weiche Regel verletzt · Rot: harte Regel verletzt</div>
</div>`;
  }

  function svgDeps(results){
    const edges = [
      { from:'asset.js', to:'registry.js', hard: true },
      { from:'ui-inspector-v1.js', to:'inspector.tab.*.js', hard: true },
      { from:'registry/ui-build', to:'inspector.bridges.js', hard: true },
    ];
    const W=680, H=160; const col1=150,col2=360,col3=560;
    const rows = [
      { y:40,  nodes:['asset.js','ui-inspector-v1.js'] },
      { y:90,  nodes:['registry.js','ui-inspector.content-v1.js'] },
      { y:130, nodes:['inspector.tab.*.js','inspector.bridges.js'] },
    ];
    const pos = {};
    rows.forEach(row=>row.nodes.forEach((name,i)=>{
      const x = [col1,col2,col3, col3+90][i] || (col1+i*180);
      pos[name] = { x, y: row.y };
    }));
    function ruleFailed(id){ return results.hard.some(r=>!r.ok && r.id===id); }

    let svg = `<div class="svg-wrap"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    Object.entries(pos).forEach(([name,p])=>{
      svg += `<rect x="${p.x-70}" y="${p.y-15}" width="140" height="30" rx="6" ry="6" fill="#1a1d22" stroke="#333"/>`;
      svg += `<text x="${p.x}" y="${p.y+4}" font-size="11" text-anchor="middle" fill="#ddd">${name}</text>`;
    });
    edges.forEach(e=>{
      const a = pos[e.from], b = pos[e.to]; if (!a||!b) return;
      let ok = true;
      if (e.hard){
        if (e.from==='ui-inspector-v1.js' && ruleFailed('insp-core-before-tabs')) ok=false;
        if (e.from==='asset.js' && ruleFailed('registry-after-asset')) ok=false;
        if (e.from==='registry/ui-build' && ruleFailed('bridge-after-registry')) ok=false;
      }
      const col = ok ? (e.hard?'#8ab4f8':'#ffcc00') : '#ff6666';
      const id = `arr_${e.from.replace(/\W/g,'')}_${e.to.replace(/\W/g,'')}`;
      svg += `<defs><marker id="${id}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${col}"/></marker></defs>`;
      svg += `<line x1="${a.x+70}" y1="${a.y}" x2="${b.x-70}" y2="${b.y}" stroke="${col}" stroke-width="2" marker-end="url(#${id})"/>`;
    });
    svg += `</svg><div class="legend">Kanten: Blau=harte OK · Gelb=weiche Empfehlung · Rot=harte Verletzung</div></div>`;
    return svg;
  }

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

  /* ================================ UI ===================================== */
  const el = (tag, cls, txt) => { const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; };

  function render(section){
    injectCSS();
    section.innerHTML = '<h2>Checker</h2>';
    const tb = el('div','chk-toolbar');
    const bScan   = el('button','chk-btn','Scan');
    const bCopy   = el('button','chk-btn','Copy JSON');
    const bExport = el('button','chk-btn','Export JSON');
    const bClear  = el('button','chk-btn','Timeline leeren');
    const inpCls  = el('input','chk-input'); inpCls.placeholder='Klassen-Filter (Regex, z.B. ^(core|ui|Inspector))';
    tb.append(bScan,bCopy,bExport,bClear, inpCls);
    section.append(tb);

    const grid = el('div','chk-grid'); section.append(grid);

    const cSeq = el('div','chk-card'); cSeq.innerHTML = `<h4>Script-Sequenz</h4><div id="chk-seq"></div>`; grid.append(cSeq);
    const cDep = el('div','chk-card'); cDep.innerHTML = `<h4>Abhängigkeiten</h4><div id="chk-deps"></div>`; grid.append(cDep);
    const cRule= el('div','chk-card'); cRule.innerHTML= `<h4>Regeln</h4><pre class="chk-pre" id="chk-rules"></pre>`; grid.append(cRule);
    const cDup = el('div','chk-card'); cDup.innerHTML = `<h4>Duplikate</h4><pre class="chk-pre" id="chk-dupes"></pre>`; grid.append(cDup);
    const cEvt = el('div','chk-card'); cEvt.innerHTML = `<h4>Event-Timeline <span class="chk-badge" id="chk-evt-count">0</span></h4><pre class="chk-pre" id="chk-evt"></pre>`; grid.append(cEvt);
    const cLis = el('div','chk-card'); cLis.innerHTML = `<h4>Event-Listener-Zähler</h4><pre class="chk-pre" id="chk-listener"></pre>`; grid.append(cLis);
    const cCls = el('div','chk-card'); cCls.innerHTML = `<h4>Klassen & Vererbung</h4><pre class="chk-pre" id="chk-classes"></pre>`; grid.append(cCls);
    const cHint= el('div','chk-card'); cHint.innerHTML= `<h4>Hinweise</h4><div id="chk-hints"></div>`; grid.append(cHint);

    const OUT = {
      seq: document.getElementById('chk-seq'),
      deps: document.getElementById('chk-deps'),
      rules: document.getElementById('chk-rules'),
      dupes: document.getElementById('chk-dupes'),
      evt: document.getElementById('chk-evt'),
      evtCount: document.getElementById('chk-evt-count'),
      hints: document.getElementById('chk-hints'),
      lst: document.getElementById('chk-listener'),
      cls: document.getElementById('chk-classes'),
      filterInput: inpCls
    };

    function renderListeners(){
      const L = window.__CHK_LISTENER__;
      if (!L){ OUT.lst.textContent='(kein Listener-Hook aktiv)'; return; }
      const totals = Object.entries(L.totals).sort((a,b)=> b[1]-a[1]).map(([t,c])=>`${String(c).padStart(4,' ')} ×  ${t}`).join('\n');
      let targets = [];
      try{
        const temp = {};
        L.mapPerTarget.forEach((map, target)=>{
          const name = (target && target.constructor && target.constructor.name) || '(Target)';
          temp[name] = (temp[name]||0) + ([...map.values()].reduce((s,v)=>s+v,0));
        });
        targets = Object.entries(temp).sort((a,b)=>b[1]-a[1]).slice(0,10)
                  .map(([n,c])=>`${String(c).padStart(4,' ')} ×  ${n}`);
      }catch(_){}
      OUT.lst.textContent = (totals?('Totals:\n'+totals):'(leer)') + (targets.length?('\n\nTop Targets:\n'+targets.join('\n')):'');
    }

    function renderClasses(){
      const re = (()=>{
        const v = OUT.filterInput.value.trim();
        if (!v) return /^(core|ui|Inspector|Path|Build|Registry)/;
        try{ return new RegExp(v); }catch(_){ return null; }
      })();
      const list = scanClasses(re||undefined);
      const ln = n=>String(n).padStart(2,' ');
      OUT.cls.textContent = list.length
        ? list.map(c=>`${c.name}${c.extends?(' : '+c.extends):''}  · ${ln(c.methodsCount)} methods${c.methodsCount?('  ['+c.methods.join(', ')+']'):''}`).join('\n')
        : '(keine passenden Klassen gefunden)';
    }

    async function doScan(){
      const S = listScripts();
      const scriptsArr = S.list;
      const rules = runRules(scriptsArr);
      const hints = buildHints(rules, S.dupes);
      const evlog = (window.__CHK_EVLOG__ && window.__CHK_EVLOG__.list) || [];

      OUT.seq.innerHTML  = svgSequence(scriptsArr, rules);
      OUT.deps.innerHTML = svgDeps(rules);
      OUT.rules.textContent = toJSON(rules);
      OUT.dupes.textContent = S.dupes.length ? S.dupes.map(d=>`${d.file} × ${d.count}`).join('\n') : '(keine)';
      OUT.evt.textContent   = evlog.slice(-200).map(e=>`${e.ts}  ${e.name}`).join('\n') || '(leer)';
      OUT.evtCount.textContent = String(evlog.length);
      renderListeners();
      renderClasses();

      window.__CHECKER_DIAG__ = {
        ts: new Date().toISOString(),
        scripts: scriptsArr,
        rules,
        dupes: S.dupes,
        events: evlog,
        listener: window.__CHK_LISTENER__ && window.__CHK_LISTENER__.totals,
        classes: scanClasses( (()=>{
          const v = OUT.filterInput.value.trim();
          return v ? new RegExp(v) : /^(core|ui|Inspector|Path|Build|Registry)/;
        })() ),
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
    OUT.filterInput.addEventListener('change', doScan);

    doScan();
    window.addEventListener('cb:insp:tab:change', (e)=>{ if (e?.detail?.tab === 'checker') doScan(); });
  }

  /* ============================= Registrierung ============================= */
  universalRegister(
    'checker',
    'insp-tab-checker',
    (section) => render(section),
    130,
    // Optional: eigenes Tab-Icon (falls du eins hast):
    // 'assets/ui/icons/checker.svg'
    undefined
  );

  /* =============================== Hilfs-Scanner =========================== */
  function scanClasses(filterRe){
    const out = [];
    const seen = new Set();
    const isClassDecl = fn => /^\s*class\s/.test(Function.prototype.toString.call(fn));
    const isCtorFn = fn => typeof fn==='function' && !/\[native code\]/.test(String(fn)) &&
                           /^[A-Z]/.test(fn.name||'') && fn.prototype && Object.getOwnPropertyNames(fn.prototype).length>1;

    Object.getOwnPropertyNames(window).forEach(k=>{
      try{
        const v = window[k];
        if (!v) return;
        if (!isClassDecl(v) && !isCtorFn(v)) return;
        if (seen.has(v)) return;
        const name = v.name || k;
        if (filterRe && !filterRe.test(name)) return;

        const proto = v.prototype || {};
        const methods = Object.getOwnPropertyNames(proto)
          .filter(n=> n!=='constructor' && typeof proto[n]==='function');

        const baseCtor = proto && Object.getPrototypeOf(proto) && Object.getPrototypeOf(proto).constructor;
        const baseName = baseCtor && baseCtor!==Object && baseCtor.name || null;

        out.push({
          name, kind: isClassDecl(v)?'class':'ctor',
          methodsCount: methods.length, methods,
          extends: baseName
        });
        seen.add(v);
      }catch(_){}
    });
    out.sort((a,b)=> a.name.localeCompare(b.name));
    return out;
  }
})();
