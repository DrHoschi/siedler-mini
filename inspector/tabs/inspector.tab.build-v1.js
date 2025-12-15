/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.build-v1.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.15-build-tab-v3-registry+runtime+stats
 *
 * Zweck   : Build-Tab – zeigt
 *           (A) Registry/Definitions-Snapshot (cb:build:snapshot)
 *           (B) Runtime/Instanzen aus Game.buildings (inkl. Needs/Delivered)
 *           + optional BuildingStock/Production-Debug (wenn vorhanden)
 *
 * Warum neu?
 *   - Alte Version erwartete b.image, Bridge liefert aber imageUrl/iconUrl.
 *   - Zusätzlich willst du Instanzdaten sehen: Lagerbestand, Produktion, Worker …
 *
 * API:
 *   window.registerInspectorTab('build', setup)
 *
 * Abhängigkeiten (optional):
 *   - Bridge: cb:build:snapshot (detail.list)
 *   - window.Game.buildings            (Runtime)
 *   - window.BuildingStock.snapshot()  (Lagerbestand pro BuildingUID)
 *   - window.Production._buildings     (DropTile/Entrance)
 *   - window.GameUnits.getUnits()      (Worker-Zuweisung)
 * ========================================================================== */
(function(){
  'use strict';

  if (typeof window.registerInspectorTab !== 'function') {
    console.warn('[build-tab] registerInspectorTab fehlt.');
    return;
  }

  const TAG = '[insp.build]';

  const S = {
    section : null,
    data    : null,   // letzter Snapshot von Bridge
    mode    : 'runtime', // 'runtime' | 'registry'
    onlyPlaced : false,
    onlyProblems : false,

    // D6-Stats: wird durch cb:worker:produce gefüttert
    // Map<buildingUid, { last:{ts,resId,qty,workerId,workerKind}, totals:{[resId]:n}, sinceTs:number }>
    prodByBuilding : new Map(),

    // kleine Render-Drosselung (damit Worker nicht 60x/s den Tab neu rendert)
    _renderScheduled : false
  };

  // -------------------------------------------------------------------------
  // Helpers – tolerant gegenüber „halb fertigen“ Daten
  // -------------------------------------------------------------------------
  const ms = v => (v==null ? '–' : `${Math.round(+v)} ms`);
  const num = (v, fb=0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
  const sizeText = s => (s ? `${s.w||'?'}×${s.h||'?'}` : '–');
  const doorText = d => (d ? `(${d.x||0},${d.y||0})` : '–');

  function safeObj(v){ return (v && typeof v === 'object') ? v : null; }

  function costText(c){
    if (!c) return '–';
    if (Array.isArray(c)) return c.map(x=>`${x?.id||'?'}:${x?.qty??x?.amount??'?'}`).join('  ');
    if (typeof c==='object') return Object.entries(c).map(([k,v])=>`${k}:${v}`).join('  ');
    return String(c);
  }

  function resText(r){
    if (!r) return '–';
    if (Array.isArray(r)) return r.join(', ');
    if (typeof r==='object') return Object.entries(r).map(([k,v])=>`${k}:${v}`).join(', ');
    return String(r);
  }

  function imgSrcForDef(def){
    // Bridge/Registry liefert mal imageUrl, mal iconUrl, mal image
    return def?.imageUrl || def?.iconUrl || def?.image || def?.icon || '';
  }

  function fmtKV(obj, order=null){
    if (!obj) return '–';
    const keys = Object.keys(obj);

    // Optional: bestimme Reihenfolge (z.B. ['wood','stone','fish'])
    let list = keys;
    if (Array.isArray(order) && order.length){
      const o = order.map(String);
      const inOrder = o.filter(k=>keys.includes(k));
      const rest = keys.filter(k=>!o.includes(k)).sort();
      list = inOrder.concat(rest);
    } else {
      list = keys.sort();
    }

    return list.map(k=>`${k}:${obj[k]}`).join(', ');
  }

  function computeUidForBuilding(b){
    // (1) wenn echtes uid existiert → nutzen
    if (b && (typeof b.uid === 'string') && b.uid) return b.uid;

    // (2) Produktions-UID-Standard: `${kind}@${x},${y}`
    const kind = (b?.kind || b?.id || 'b');
    const x = Number.isFinite(b?.x) ? (b.x|0) : 0;
    const y = Number.isFinite(b?.y) ? (b.y|0) : 0;
    return `${kind}@${x},${y}`;
  }

  function getRuntimeBuildings(){
    const G = window.Game || {};
    if (Array.isArray(G.buildings)) return G.buildings;
    if (typeof G.getBuildings === 'function') {
      try { return G.getBuildings() || []; } catch(_) {}
    }
    return [];
  }

  function getUnits(){
    const GU = window.GameUnits || {};
    if (typeof GU.getUnits === 'function') {
      try { return GU.getUnits() || []; } catch(_) {}
    }
    // Fallback: alte Variante
    if (Array.isArray(GU.units)) return GU.units;
    return [];
  }

  function getWorkerModeCounts(uid){
    const units = getUnits();
    const out = { total:0, toWork:0, work:0, toHome:0, other:0 };

    for (const u of units){
      if (!u || u.type !== 'worker') continue;
      if (String(u.homeUid||'') !== String(uid)) continue;

      out.total++;
      const mode = String(u._ai?.mode || '').toLowerCase();
      if (mode === 'towork') out.toWork++;
      else if (mode === 'work') out.work++;
      else if (mode === 'tohome') out.toHome++;
      else out.other++;
    }
    return out;
  }

  function countWorkersFor(uid){
    return getWorkerModeCounts(uid).total;
  }

  function getStockFor(uid){
    const BS = window.BuildingStock;
    if (!BS || typeof BS.snapshot !== 'function') return null;
    try {
      const snap = BS.snapshot() || {};
      return snap[uid] || null;
    } catch(e){
      return null;
    }
  }

  function getOutstandingFor(uid, resId=null){
    const BS = window.BuildingStock;
    if (!BS) return null;

    // bevorzugt: offizieller API-Helfer
    if (typeof BS.getOutstanding === 'function'){
      try { return BS.getOutstanding(uid, resId) | 0; } catch(_) { return null; }
    }

    // Fallback: Debug-State lesen (Map<uid, Map<res,count>>)
    const M = BS._state?.OUTSTANDING;
    if (!M || typeof M.get !== 'function') return null;

    try{
      const mm = M.get(String(uid));
      if (!mm) return 0;

      if (resId){
        return (Number(mm.get(String(resId))) || 0) | 0;
      }

      let sum = 0;
      for (const v of mm.values()) sum += (Number(v)||0);
      return sum | 0;
    }catch(_){
      return null;
    }
  }

  function getProdMeta(uid){
    const P = window.Production;
    const map = P?._buildings;
    if (!map || typeof map.get !== 'function') return null;
    try { return map.get(uid) || null; } catch(_) { return null; }
  }

  function getJobMetaCountFor(uid){
    const BS = window.BuildingStock;
    const JM = BS?._state?.JOBMETA;
    if (!JM || typeof JM.forEach !== 'function') return null;

    let c = 0;
    try{
      JM.forEach((meta)=>{
        if (String(meta?.bUid||'') === String(uid)) c++;
      });
    }catch(_){
      return null;
    }
    return c;
  }

  function getProdStatsFor(uid){
    try { return S.prodByBuilding.get(String(uid)) || null; } catch(_) { return null; }
  }

  function fmtTime(ts){
    if (!ts) return '–';
    try{
      const d = new Date(Number(ts));
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      const ss = String(d.getSeconds()).padStart(2,'0');
      return `${hh}:${mm}:${ss}`;
    }catch(_){
      return '–';
    }
  }


  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  // -------------------------------------------------------------------------
  // UI – CSS
  // -------------------------------------------------------------------------
  function injectCSS(){
    if (document.getElementById('insp-build-inline-style-v2')) return;
    const st = document.createElement('style'); st.id='insp-build-inline-style-v2';
    st.textContent = `
#inspector .build-toolbar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.25rem 0 .75rem}
#inspector .insp-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .insp-pill{padding:.25rem .6rem;border:1px solid #2a2a2e;background:#151515;border-radius:999px;cursor:pointer;opacity:.9}
#inspector .insp-pill.is-active{background:#1c2430;border-color:#3a5a86;opacity:1}
#inspector .build-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.75rem;align-items:start}
#inspector .build-card{border:1px solid #2a2a2e;border-radius:.6rem;padding:.5rem;background:#111}
#inspector .build-card h4{margin:.1rem 0 .45rem;display:flex;justify-content:space-between;gap:.5rem;align-items:center}
#inspector .build-chip{font-size:.75em;opacity:.75;border:1px solid #2a2a2e;padding:.12rem .35rem;border-radius:.35rem}
#inspector .build-card-img{width:100%;height:120px;object-fit:contain;background:#0c0c0c;border:1px solid #222;border-radius:.35rem}
#inspector .build-card-img.is-missing{display:block;min-height:120px;background:repeating-linear-gradient(45deg,#1a1a1a,#1a1a1a 8px,#151515 8px,#151515 16px)}
#inspector .build-table{width:100%;border-collapse:collapse;margin-top:.35rem;font-size:.9em}
#inspector .build-table th,#inspector .build-table td{padding:.2rem .25rem;border-bottom:1px dashed #262626;vertical-align:top}
#inspector .build-table th{opacity:.7;text-align:left;width:40%}
#inspector .muted{opacity:.75}
#inspector .warn{color:#ffcf66}
#inspector .bad{color:#ff6b6b}
#inspector .ok{color:#8cff9b}
    `;
    document.head.appendChild(st);
  }

  function imgEl(src){
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = 'icon';
    img.referrerPolicy = 'no-referrer';
    img.className = 'build-card-img';
    if (src) img.src = src;
    else img.classList.add('is-missing');
    return img;
  }

  // -------------------------------------------------------------------------
  // Render: Registry / Definitions (Bridge Snapshot)
  // -------------------------------------------------------------------------
  function renderRegistry(list){
    const grid = S.section.querySelector('.build-grid');
    grid.innerHTML = '';

    const filtered = (list || []).slice();

    for (const def of filtered){
      const card = document.createElement('div'); card.className='build-card';
      const h4 = document.createElement('h4');
      h4.innerHTML = `<span>${escapeHtml(def.name || def.id || 'building')}</span><span class="build-chip">def</span>`;

      const img = imgEl(imgSrcForDef(def));

      const tbl = document.createElement('table'); tbl.className='build-table';
      tbl.innerHTML = `
        <tr><th>ID</th><td><code>${escapeHtml(def.id||'')}</code></td></tr>
        <tr><th>Kategorie</th><td>${escapeHtml(def.category || 'building')}</td></tr>
        <tr><th>Kosten</th><td>${escapeHtml(costText(def.cost))}</td></tr>
        <tr><th>Ressourcen</th><td>${escapeHtml(resText(def.res))}</td></tr>
        <tr><th>Bauzeit</th><td>${escapeHtml(ms(def.timeMs))}</td></tr>
        <tr><th>Größe</th><td>${escapeHtml(sizeText(def.size))}</td></tr>
        <tr><th>Tür</th><td>${escapeHtml(doorText(def.door))}</td></tr>
      `;

      card.append(h4, img, tbl);
      grid.append(card);
    }

    if (!filtered.length){
      const p = document.createElement('p');
      p.innerHTML = '<em>Keine Daten. Tip: „Snapshot anfordern“ oder Registry/Bridge prüfen.</em>';
      grid.append(p);
    }
  }

  // -------------------------------------------------------------------------
  // Render: Runtime / Instanzen (Game.buildings)
  // -------------------------------------------------------------------------
  function renderRuntime(){
    const grid = S.section.querySelector('.build-grid');
    grid.innerHTML = '';

    const buildings = getRuntimeBuildings();

    // optional Filter: nur platzierte (= Liste) – ist eigentlich immer so
    let list = buildings.slice();

    // optional: nur "Probleme" (noch nicht fertig / missing)
    if (S.onlyProblems){
      list = list.filter(b=>{
        const st = String(b?.status||'');
        const needs = safeObj(b?.needs);
        const delivered = safeObj(b?.delivered);
        // Problem, wenn pending/building oder needs existieren und noch fehlen
        if (st && st !== 'done') return true;
        if (needs && delivered){
          return Object.keys(needs).some(k => (delivered[k]|0) < (needs[k]|0));
        }
        return false;
      });
    }

    for (const b of list){
      const uid = computeUidForBuilding(b);
      const prod = getProdMeta(uid);

      const needs = safeObj(b?.needs) || null;
      const delivered = safeObj(b?.delivered) || null;

      let remaining = null;
      if (needs && delivered){
        remaining = {};
        Object.keys(needs).forEach(k=>{
          const need = needs[k] | 0;
          const del  = delivered[k] | 0;
          const miss = Math.max(0, need - del);
          if (miss > 0) remaining[k] = miss;
        });
      }

      const stock = getStockFor(uid);
      const outstanding = getOutstandingFor(uid);

      const workerCount = countWorkersFor(uid);

      const st = String(b?.status || '');
      const stage = Number.isFinite(b?.buildStage) ? (b.buildStage|0) : null;

      const stateLabel = st ? st : (stage === 0 ? 'site' : '–');
      const stateClass =
        (stateLabel === 'done') ? 'ok' :
        (stateLabel === 'pending' || stateLabel === 'building' || stateLabel === 'site') ? 'warn' :
        'muted';

      const card = document.createElement('div'); card.className='build-card';
      const h4 = document.createElement('h4');
      h4.innerHTML = `<span>${escapeHtml(b.id || b.kind || 'building')}</span><span class="build-chip ${stateClass}">${escapeHtml(stateLabel)}</span>`;

      const tbl = document.createElement('table'); tbl.className='build-table';

      // Weiche Werte (mit Fallback)
      const x = Number.isFinite(b?.x) ? (b.x|0) : '–';
      const y = Number.isFinite(b?.y) ? (b.y|0) : '–';
      const w = Number.isFinite(b?.w) ? (b.w|0) : '–';
      const h = Number.isFinite(b?.h) ? (b.h|0) : '–';

      const dropSlots = Array.isArray(b?.dropSlots) ? b.dropSlots.length : 0;

      const prodInfo = prod
        ? `drop: (${prod.dropTx ?? '–'},${prod.dropTy ?? '–'})`
        : '–';

      // Stock: bevorzugt geordnet (wood/stone/fish zuerst), danach Rest
      const stockInfo = stock ? fmtKV(stock, ['wood','stone','fish']) : '–';

      // Outstanding: pro Ressource + total (wenn möglich)
      const outWood = getOutstandingFor(uid, 'wood');
      const outStone= getOutstandingFor(uid, 'stone');
      const outFish = getOutstandingFor(uid, 'fish');
      const outTotal= (outstanding == null) ? getOutstandingFor(uid, null) : outstanding;

      const outInfo = (outTotal == null)
        ? '–'
        : `total=${outTotal}` + (
            (outWood==null && outStone==null && outFish==null)
              ? ''
              : ` (wood=${outWood||0}, stone=${outStone||0}, fish=${outFish||0})`
          );

      // Worker-Counts pro Mode (toWork/work/toHome)
      const wm = getWorkerModeCounts(uid);
      const workerInfo = `${wm.total} (toWork=${wm.toWork}, work=${wm.work}, toHome=${wm.toHome}${wm.other?`, other=${wm.other}`:''})`;

      // D6 Produktion (cb:worker:produce)
      const ps = getProdStatsFor(uid);
      const lastInfo = ps?.last
        ? `${fmtTime(ps.last.ts)}  ${ps.last.resId}+${ps.last.qty}`
        : '–';
      const totalsInfo = ps?.totals ? fmtKV(ps.totals, ['wood','stone','fish']) : '–';

      // Stock-Jobs im Queue (Debug)
      const jobMetaCount = getJobMetaCountFor(uid);
      const jobMetaInfo = (jobMetaCount==null) ? '–' : String(jobMetaCount);

      const needsInfo = needs ? fmtKV(needs) : '–';
      const delInfo = delivered ? fmtKV(delivered) : '–';
      const remInfo = remaining ? fmtKV(remaining) : '–';

      tbl.innerHTML = `
        <tr><th>UID</th><td><code>${escapeHtml(uid)}</code></td></tr>
        <tr><th>Pos / Größe</th><td>${escapeHtml(`${x},${y}  (${w}×${h})`)}</td></tr>
        <tr><th>Needs</th><td>${escapeHtml(needsInfo)}</td></tr>
        <tr><th>Delivered</th><td>${escapeHtml(delInfo)}</td></tr>
        <tr><th>Fehlt</th><td>${escapeHtml(remInfo)}</td></tr>
        <tr><th>DropSlots</th><td>${escapeHtml(String(dropSlots))}</td></tr>
        <tr><th>Lager (Stock)</th><td>${escapeHtml(stockInfo)}</td></tr>
        <tr><th>Pull-Jobs offen</th><td>${escapeHtml(outInfo)}</td></tr>
        <tr><th>Stock-Jobs Queue</th><td>${escapeHtml(jobMetaInfo)}</td></tr>
        <tr><th>Worker</th><td>${escapeHtml(workerInfo)}</td></tr>
        <tr><th>Letzte Produktion</th><td>${escapeHtml(lastInfo)}</td></tr>
        <tr><th>Produziert seit Start</th><td>${escapeHtml(totalsInfo)}</td></tr>
        <tr><th>Prod-Meta</th><td>${escapeHtml(prodInfo)}</td></tr>
      `;

      card.append(h4, tbl);
      grid.append(card);
    }

    if (!list.length){
      const p = document.createElement('p');
      p.innerHTML = '<em>Keine Runtime-Buildings gefunden (Game.buildings ist leer?).</em>';
      grid.append(p);
    }
  }

  // -------------------------------------------------------------------------
  // Snapshot Handling (Bridge)
  // -------------------------------------------------------------------------
  function onSnapshot(ev){
    S.data = ev?.detail || {};
    if (S.mode === 'registry') renderRegistry(S.data.list || []);
  }

  function requestSnapshot(){
    try { window.dispatchEvent(new CustomEvent('req:build:snapshot')); } catch(_) {}
  }

    // -------------------------------------------------------------------------
  // D6 Event: cb:worker:produce → Stats sammeln + ggf. Runtime-Render anstoßen
  // -------------------------------------------------------------------------
  function scheduleRuntimeRender(){
    if (S._renderScheduled) return;
    S._renderScheduled = true;
    setTimeout(()=>{
      S._renderScheduled = false;
      if (S.mode === 'runtime') renderRuntime();
    }, 120);
  }

  function onWorkerProduce(ev){
    const d = ev?.detail || {};
    const uid = String(d.buildingUid || '').trim();
    if (!uid) return;

    const res = String(d.resId || '').trim();
    const qty = Math.max(1, Number(d.qty) || 1);
    const ts  = Number(d.ts || Date.now());

    const st = S.prodByBuilding.get(uid) || { last:null, totals:{}, sinceTs: ts };
    st.last = { ts, resId: res || 'wood', qty, workerId: d.workerId || null, workerKind: d.workerKind || '' };
    st.totals[st.last.resId] = (Number(st.totals[st.last.resId]) || 0) + qty;

    S.prodByBuilding.set(uid, st);

    // Live-Update im Inspector (nur wenn Tab bereits geöffnet ist)
    if (S.section && S.mode === 'runtime') scheduleRuntimeRender();
  }

// -------------------------------------------------------------------------
  // Exports / Debug (optional)
  // -------------------------------------------------------------------------
  window.InspectorBuildTab = {
    dump: () => ({
      mode: S.mode,
      snapshot: S.data,
      runtimeCount: getRuntimeBuildings().length
    }),
    refresh: () => {
      if (S.mode === 'registry') requestSnapshot();
      else renderRuntime();
    }
  };

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------
  window.registerInspectorTab('build', function setup(section){
    injectCSS();
    S.section = section;

    section.innerHTML = '<h2>Build</h2>';

    const tb = document.createElement('div'); tb.className='build-toolbar';

    // Mode Buttons
    const btnRuntime = document.createElement('button'); btnRuntime.className='insp-pill is-active'; btnRuntime.textContent='Runtime';
    const btnRegistry = document.createElement('button'); btnRegistry.className='insp-pill'; btnRegistry.textContent='Registry';

    // Actions
    const btnRefresh = document.createElement('button'); btnRefresh.className='insp-btn'; btnRefresh.textContent='Refresh';
    const btnReq = document.createElement('button'); btnReq.className='insp-btn'; btnReq.textContent='Snapshot anfordern';
    const btnJson= document.createElement('button'); btnJson.className='insp-btn'; btnJson.textContent='Export JSON';

    const chkProblems = document.createElement('label');
    chkProblems.className = 'muted';
    chkProblems.style.display='flex';
    chkProblems.style.alignItems='center';
    chkProblems.style.gap='.4rem';
    chkProblems.innerHTML = `<input type="checkbox"> nur Probleme`;
    const chkEl = chkProblems.querySelector('input');

    tb.append(btnRuntime, btnRegistry, btnRefresh, btnReq, btnJson, chkProblems);
    section.append(tb);

    const grid = document.createElement('div'); grid.className='build-grid';
    section.append(grid);

    // Event: Snapshot
    window.addEventListener('cb:build:snapshot', onSnapshot);
  window.addEventListener('cb:worker:produce', onWorkerProduce);

    // Handlers
    btnRuntime.onclick = () => {
      S.mode = 'runtime';
      btnRuntime.classList.add('is-active');
      btnRegistry.classList.remove('is-active');
      btnReq.disabled = true;
      renderRuntime();
    };

    btnRegistry.onclick = () => {
      S.mode = 'registry';
      btnRegistry.classList.add('is-active');
      btnRuntime.classList.remove('is-active');
      btnReq.disabled = false;
      requestSnapshot();
    };

    btnRefresh.onclick = () => {
      if (S.mode === 'registry') requestSnapshot();
      else renderRuntime();
    };

    btnReq.onclick = requestSnapshot;

    chkEl.onchange = () => {
      S.onlyProblems = !!chkEl.checked;
      if (S.mode === 'runtime') renderRuntime();
    };

    btnJson.onclick = () => {
      const payload = (S.mode === 'registry')
        ? (S.data || {})
        : ({ runtime: getRuntimeBuildings(), stock: window.BuildingStock?.snapshot?.() || null });

      const data = JSON.stringify(payload, null, 2);
      const url = URL.createObjectURL(new Blob([data],{type:'application/json'}));
      const a = Object.assign(document.createElement('a'), {href:url, download:`build-${S.mode}-export.json`});
      document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    // Default: Runtime sofort anzeigen (kein Warten auf Snapshot)
    btnReq.disabled = true;
    renderRuntime();
  });

})();