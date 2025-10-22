/* ============================================================================
 * Datei   : ui/inspector/inspector.resources.js
 * Projekt : Neue Siedler – Inspector (Resources-Tab)
 * Version : v18.15.1 (final)
 *
 * Zweck   : Entwickler-/Debug-Tab für Ressourcen:
 *           - Live-Bestände anzeigen (Quelle: Registry/Game/Snapshot)
 *           - Deltas seit letztem Snapshot
 *           - Produzenten/Verbraucher pro Ressource (aus Registry/Buildings)
 *           - Aktionen: Refresh, Snapshot anfordern, Export JSON/CSV,
 *             Auto-Update, Suche/Filter
 *
 * Abh.    : Inspector-Core (window.Inspector)
 *           Registry/Build-Daten (optional) → zur Ermittlung von Producer/Consumer
 *           Game/Engine (optional) → reagiert auf req:res:snapshot und feuert cb:res:snapshot
 *
 * Events  : (Empfänger)
 *           - cb:res:snapshot  { resources:{...} } → Tabelle/Delta aktualisieren
 *           - cb:res:change    { id, old, value, reason? } → Delta/Log eintragen
 *           - cb:res:reset                         → Werte / Delta zurücksetzen
 *
 *           (Sender)
 *           - req:res:snapshot → Game/Engine soll aktuellen Stand liefern
 *
 * Hinweise:
 *  - Tab-ID im Inspector-Core heißt „res“ (Slot: res-view).
 *  - Der Tab funktioniert OHNE Engine-Events (liest dann direkt Registry/Game).
 *  - Produzenten/Verbraucher werden „best effort“ aus Registry/Buildings abgeleitet.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.resources]';
  const L = {
    info : (window.CBLog?.info || console.info).bind(console, MOD),
    ok   : (window.CBLog?.ok   || console.log ).bind(console, MOD),
    warn : (window.CBLog?.warn || console.warn).bind(console, MOD),
    err  : (window.CBLog?.error|| console.error).bind(console, MOD)
  };
  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const toKey = v => String(v??'').trim();

  /* -------------------------------- Quellen --------------------------------- */
  // Rohstoff-Bestand „irgendwo“ finden (robust gegen deine verschiedenen Builds)
  function getResRaw(){
    const R = window.Registry || window.registry || {};
    if (R.resources) return R.resources;
    if (R.data?.resources) return R.data.resources;

    const G = window.Game || {};
    if (G.resources) return G.resources;
    if (G.res) return G.res;
    if (G.state?.resources) return G.state.resources;

    // evtl. via global Snapshot?
    if (window.__RES_SNAPSHOT__) return window.__RES_SNAPSHOT__;
    return null;
  }

  // Buildings/Produzenten/Verbraucher finden (nutzt Logik ähnlich Build-Tab)
  function getBuildingsRaw(){
    // 1) Registry / UIBuild
    const R = window.Registry || window.BuildRegistry || {};
    if (R.buildings) return R.buildings;
    if (R.data?.buildings) return R.data.buildings;
    const U = window.UIBuild || window.BuildUI || {};
    if (U.registry) return U.registry;
    if (U.data?.buildings) return U.data.buildings;

    // 2) Zuletzt geladene buildings.json evtl. im globalen Cache?
    if (window.__BUILDINGS__) return window.__BUILDINGS__;
    return null;
  }

  // „Array-map“ Normalisierung für Buildings (id → entry)
  function asMap(objOrArray){
    if (!objOrArray) return {};
    if (Array.isArray(objOrArray)){
      const map={}; for(const it of objOrArray){ const id=toKey(it?.id||it?.key||it?.name||''); if(id) map[id]=it; }
      return map;
    }
    return objOrArray;
  }

  /* ---------------------- Producer/Consumer-Ableitung ----------------------- */
  // heuristische Felder: produces/output/production – consumes/input/cost/resources/requirements.cost
  function listProducersConsumers(){
    const br = asMap(getBuildingsRaw());
    const producers = {};  // resId → Set(buildId)
    const consumers = {};  // resId → Set(buildId)

    function add(map, resId, bId){
      if (!resId||!bId) return;
      map[resId] = map[resId] || new Set();
      map[resId].add(bId);
    }

    for (const [bid, b] of Object.entries(br)){
      const prod = b.produces || b.output || b.production || null;
      const cons = b.consumes || b.input || b.cost || b.resources || b.requirements?.cost || null;

      if (prod && typeof prod==='object'){
        for (const [rid, val] of Object.entries(prod)){ if (val) add(producers, rid, bid); }
      }
      if (cons && typeof cons==='object'){
        for (const [rid, val] of Object.entries(cons)){ if (val) add(consumers, rid, bid); }
      }
    }

    // in String-Listen wandeln für Anzeige
    const toPlain = obj => Object.fromEntries(Object.entries(obj).map(([k,set])=>[k, Array.from(set)]));
    return { producers: toPlain(producers), consumers: toPlain(consumers) };
  }

  /* ------------------------------ Icons / Bilder ---------------------------- */
  function iconFor(resId){
    const guess = [
      `assets/icons/resources/${resId}.png`,
      `assets/${resId}.png`,
      `ui/img/${resId}.png`,
      `${resId}.png`
    ];
    return guess[0]; // wir zeigen nur den ersten an; echte Existenz ist hier sekundär
  }

  /* ------------------------------ Zustand/Cache ----------------------------- */
  let rows = [];                 // [{id,name,value,delta,icon,prod:[...],cons:[...]}...]
  let lastSnapshot = {};         // resId → value (für Delta)
  let source = '…';              // Quelle-Label
  let autoTimer = 0;             // setInterval-Handle

  function snapshotFromRaw(raw){
    // raw kann {holz: 10, stein:0, ...} oder [{id:'holz',value:10}] sein
    const snap = {};
    if (Array.isArray(raw)){
      for (const it of raw){
        const id = toKey(it?.id||it?.key||it?.name); if (!id) continue;
        snap[id] = Number(it.value ?? it.amount ?? it.qty ?? 0);
      }
      return snap;
    }
    if (raw && typeof raw==='object'){
      for (const [k,v] of Object.entries(raw)){
        snap[toKey(k)] = Number(v?.value ?? v ?? 0);
      }
      return snap;
    }
    return {};
  }

  function computeRows(snap){
    const {producers, consumers} = listProducersConsumers();
    const out=[];
    const ids = Object.keys(snap).sort((a,b)=>a.localeCompare(b));
    for (const id of ids){
      const val = Number(snap[id]||0);
      const delta = val - Number(lastSnapshot[id]??val);
      out.push({
        id,
        name: id,                     // (optional: Lokalisierung)
        value: val,
        delta,
        icon: iconFor(id),
        prod: producers[id] || [],
        cons: consumers[id] || []
      });
    }
    return out;
  }

  /* --------------------------------- UI ------------------------------------- */
  window.Inspector?.mount?.('res', (host)=>{
    host.innerHTML = `
      <div class="pad">
        <div class="toolbar" style="flex-wrap:wrap; gap:8px; align-items:center">
          <button class="insp-btn" id="r-refresh">Refresh</button>
          <button class="insp-btn" id="r-snapshot">Snapshot anfordern</button>
          <button class="insp-btn" id="r-export">Export JSON</button>
          <button class="insp-btn" id="r-csv">Export CSV</button>
          <label class="hint">Auto-Update:
            <select id="r-auto" class="insp-btn" style="min-width:120px">
              <option value="0">(aus)</option>
              <option value="1000">1 s</option>
              <option value="5000">5 s</option>
              <option value="10000">10 s</option>
            </select>
          </label>
          <input id="r-q" class="insp-btn" placeholder="Suche (ID/Name)">
          <label class="hint"><input type="checkbox" id="r-only"> nur > 0</label>
          <span id="r-hint" class="hint"></span>
        </div>

        <div id="r-info" class="hint" style="margin-bottom:8px"></div>

        <div style="overflow:auto; max-height:55vh; border:1px solid #444; border-radius:6px">
          <table class="inspector-table" id="r-table">
            <thead>
              <tr>
                <th style="width:42px"></th>
                <th data-k="id">ID</th>
                <th data-k="name">Name</th>
                <th data-k="value" style="width:120px">Menge</th>
                <th data-k="delta" style="width:120px">Δ</th>
                <th>Produzenten</th>
                <th>Verbraucher</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;

    const ui = {
      hint:  $('#r-hint', host),
      info:  $('#r-info', host),
      tbody: $('#r-table tbody', host),
      head:  $('#r-table thead', host),
      q:     $('#r-q', host),
      only:  $('#r-only', host),
      auto:  $('#r-auto', host)
    };

    let sortKey='id', sortDir=1, filterQ='', onlyPositive=false;

    function setHint(t){ ui.hint.textContent=t; setTimeout(()=>ui.hint.textContent='', 1200); }

    function renderInfo(){
      const sum = rows.reduce((a,b)=>a+(Number.isFinite(b.value)?b.value:0),0);
      ui.info.textContent = `Quelle: ${source} – Einträge: ${rows.length} – Summe: ${sum}`;
    }

    function renderTable(){
      let data = rows
        .filter(r=>{
          if (onlyPositive && !(r.value>0)) return false;
          if (!filterQ) return true;
          const blob = `${r.id} ${r.name}`.toLowerCase();
          return blob.includes(filterQ.toLowerCase());
        })
        .sort((a,b)=>{
          const A=(a[sortKey]??''); const B=(b[sortKey]??'');
          if (typeof A==='number' || typeof B==='number'){
            return (Number(A)-Number(B))*sortDir;
          }
          return A.toString().localeCompare(B.toString())*sortDir;
        });

      ui.tbody.innerHTML = data.map(r=>{
        const delta = r.delta||0;
        const dCol = delta>0 ? '#3bd16f' : delta<0 ? '#f87171' : '#b9bac1';
        const prod = r.prod.length ? r.prod.join(', ') : '';
        const cons = r.cons.length ? r.cons.join(', ') : '';
        return `
          <tr>
            <td style="text-align:center"><img src="${r.icon}" alt="" style="width:24px;height:24px;object-fit:contain"></td>
            <td><code>${r.id}</code></td>
            <td>${r.name}</td>
            <td style="text-align:right">${r.value}</td>
            <td style="text-align:right; color:${dCol}">${delta>0?`+${delta}`:delta}</td>
            <td>${prod}</td>
            <td>${cons}</td>
          </tr>`;
      }).join('');
    }

    function applyAndRender(snap, srcLabel){
      source = srcLabel || source;
      rows = computeRows(snap);
      renderInfo();
      renderTable();
      // neuen Snapshot als Vergleichsbasis speichern
      lastSnapshot = Object.assign({}, snap);
    }

    /* ----------------------------- Daten laden ------------------------------ */
    function refreshFromLocal(){
      const raw = getResRaw();
      const snap = snapshotFromRaw(raw);
      applyAndRender(snap, 'Registry/Game');
      L.ok('Refresh lokale Quelle', {count:Object.keys(snap).length});
    }

    function requestSnapshot(){
      window.dispatchEvent(new Event('req:res:snapshot')); // Engine soll liefern
      setHint('Snapshot angefordert');
    }

    function exportJSON(){
      const payload = {
        ts: new Date().toISOString(),
        source,
        items: rows.map(r=>({id:r.id,name:r.name,value:r.value,delta:r.delta,prod:r.prod,cons:r.cons}))
      };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`resources_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      setHint('Export JSON ok');
    }

    function exportCSV(){
      const head = ['id','name','value','delta','producers','consumers'];
      const lines = [ head.join(';') ];
      for (const r of rows){
        const line = [
          r.id, r.name, r.value, r.delta,
          (r.prod||[]).join('|'), (r.cons||[]).join('|')
        ].map(v => String(v).replace(/;/g, ',')).join(';');
        lines.push(line);
      }
      const blob = new Blob([lines.join('\n')], {type:'text/csv'});
      const a = document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`resources_${new Date().toISOString().replace(/[:\.]/g,'-')}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      setHint('Export CSV ok');
    }

    /* ---------------------------- Event-Bindings ---------------------------- */
    // Buttons
    $('#r-refresh',  host).addEventListener('click', refreshFromLocal);
    $('#r-snapshot', host).addEventListener('click', requestSnapshot);
    $('#r-export',   host).addEventListener('click', exportJSON);
    $('#r-csv',      host).addEventListener('click', exportCSV);

    // Suche/Filter/Sort
    ui.q.addEventListener('input', ()=>{ filterQ=ui.q.value.trim(); renderTable(); });
    ui.only.addEventListener('change', ()=>{ onlyPositive=ui.only.checked; renderTable(); });
    ui.head.addEventListener('click', e=>{
      const th = e.target.closest('th'); if (!th) return;
      const k  = th.dataset.k; if (!k) return;
      if (sortKey===k) sortDir*=-1; else { sortKey=k; sortDir=1; }
      renderTable();
    });

    // Auto-Update
    ui.auto.addEventListener('change', ()=>{
      const ms = Number(ui.auto.value||0);
      if (autoTimer){ clearInterval(autoTimer); autoTimer=0; }
      if (ms>0) autoTimer = setInterval(refreshFromLocal, ms);
      setHint(ms?`Auto: ${ms}ms`:'Auto aus');
    });

    // Engine/Spiel-Events
    window.addEventListener('cb:res:snapshot', (e)=>{
      const raw = e?.detail?.resources || e?.detail || {};
      const snap = snapshotFromRaw(raw);
      applyAndRender(snap, 'Snapshot');
      L.ok('Snapshot empfangen', {count:Object.keys(snap).length});
    });

    window.addEventListener('cb:res:change', (e)=>{
      // inkrementelle Änderung – wir aktualisieren Value/Delta und rendern Zeile neu
      const d = e?.detail || {}; const id = toKey(d.id);
      if (!id) return;
      const val = Number(d.value ?? 0);
      const old = Number(d.old ?? lastSnapshot[id] ?? val);
      lastSnapshot[id] = val; // Snapshot mitziehen
      const i = rows.findIndex(r=>r.id===id);
      if (i>=0){
        rows[i].value = val;
        rows[i].delta = val - old;
      }else{
        // neue Ressource – Tabelle erweitern
        rows.push({
          id, name:id, value:val, delta:val-old,
          icon:iconFor(id), prod:[], cons:[]
        });
      }
      renderInfo(); renderTable();
    });

    window.addEventListener('cb:res:reset', ()=>{
      lastSnapshot = {};
      refreshFromLocal();
      setHint('Reset erhalten');
    });

    // Tab-Wechsel → bei Anzeige aktualisieren
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if ((e.detail?.tab||'')==='res') refreshFromLocal();
    });

    // Initial
    refreshFromLocal();
    L.ok('bereit v18.15.1');

    // Debug/Dev-Hook
    window.__inspRes = Object.assign(window.__inspRes||{}, {
      refresh: refreshFromLocal,
      snapshot: requestSnapshot
    });
  });
})();
