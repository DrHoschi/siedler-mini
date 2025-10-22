/* ============================================================================
 * Datei   : ui/inspector/inspector.build.js
 * Projekt : Neue Siedler – Inspector (Build-Tab)
 * Version : v18.15.0 (final restore)
 *
 * Zweck   : Entwicklertab für Gebäude-/Registry-Daten.
 *           - Liest die Registry (mehrere mögliche Quellen; robust)
 *           - Optionaler Fallback: lädt data/buildings.json (nur Ansicht)
 *           - Zeigt Tabelle: ID, Titel, Kategorie, Größe, Kosten
 *           - Filter (Kategorie), Suche, Sortieren per Klick auf Spalten
 *           - Validierung: fehlende Felder, unbekannte Kategorien, Duplikate
 *           - Aktionen: Refresh, Kategorien-Check, Export JSON, Build-Menü öffnen
 *           - Reagiert auf cb:registry:ready / cb:registry:snapshot (Auto-Refresh)
 *
 * Abh.    : Inspector-Core (window.Inspector), optional:
 *           window.Registry / window.BuildRegistry / window.registry
 *           ui/ui-build.js Event-Bridges (req:buildmenu:show)
 *
 * Events  : req:registry:snapshot   – Registry-Dumps (falls implementiert)
 *           cb:registry:ready       – wenn Registry bereit (Auto-Refresh)
 *           cb:registry:snapshot    – wenn Snapshot erstellt (Auto-Refresh)
 *           req:buildmenu:show      – Build-Menü öffnen (falls vorhanden)
 * ========================================================================== */

/* ============================================================================
 * Datei   : ui/inspector/inspector.build.js
 * Projekt : Neue Siedler – Inspector (Build-Tab)
 * Version : v18.15.1 (final restore+finder)
 *
 * Zweck   : Entwicklertab für Gebäude-/Registry-Daten.
 *           - Registry/ UI-Build/ buildings.json robust auslesen
 *           - Tabelle: ID, Titel, Kategorie, Größe, Kosten
 *           - Filter, Suche, Sortieren
 *           - Aktionen: Refresh, Kategorien-Check, Export JSON, Build-Menü
 *           - Reagiert auf cb:registry:ready / cb:registry:snapshot
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.build]';
  const logI = (window.CBLog?.info || console.info).bind(console, MOD);
  const logO = (window.CBLog?.ok   || console.log ).bind(console, MOD);
  const logW = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const logE = (window.CBLog?.error|| console.error).bind(console, MOD);

  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const toKey = x => String(x??'').trim();

  function fmtCost(cost){
    if (!cost || typeof cost!=='object') return '';
    const out=[]; for(const [k,v] of Object.entries(cost)){ if(v) out.push(`${k}:${v}`); }
    return out.join(', ');
  }
  function extractSize(e){
    if (!e) return '';
    const s = e.size || e.footprint || null;
    if (s && typeof s==='object'){
      const w = s.w ?? s.width  ?? e.w ?? e.width;
      const h = s.h ?? s.height ?? e.h ?? e.height;
      if (w && h) return `${w}×${h}`;
    }
    if (typeof e.size === 'string'){
      const m = e.size.match(/(\d+)\s*[x×]\s*(\d+)/i);
      if (m) return `${m[1]}×${m[2]}`;
    }
    const w2 = e.w ?? e.width, h2 = e.h ?? e.height;
    if (w2 && h2) return `${w2}×${h2}`;
    return '';
  }

  /* ---------- NEU: breite Suche nach Buildings in Registry / UIBuild ---------- */
  function getRegistryRaw(){
    // Klassische Registry-Objekte
    const R = window.Registry || window.BuildRegistry || window.registry || {};
    if (R.buildings) return R.buildings;
    if (R.data?.buildings) return R.data.buildings;
    if (typeof R.get==='function'){ try{ const g=R.get('buildings'); if(g) return g; }catch(_){} }

    // UIBuild-Varianten (bei deinen Demos häufig)
    const U = window.UIBuild || window.BuildUI || {};
    if (U.registry) return U.registry;              // Map oder Array
    if (U.data?.buildings) return U.data.buildings; // Array oder Map
    if (U.buildings) return U.buildings;

    return null;
  }

  function nor(entry, fallbackKey){
    entry = entry || {};
    const id   = toKey(entry.id || entry.key || fallbackKey || entry.name || entry.title);
    const name = toKey(entry.title || entry.name || id);
    const cat  = toKey(entry.category || entry.cat || entry.group);
    const cost = entry.cost || entry.price || entry.requirements?.cost || entry.resources || null;
    const size = extractSize(entry);
    const icon = entry.icon || entry.sprite || entry.img || '';
    return { id, name, category:cat, size, cost, icon, _src: entry };
  }

  function harvestRegistry(){
    const raw = getRegistryRaw();
    if (!raw) return [];

    if (Array.isArray(raw)) return raw.map(nor);

    if (typeof raw==='object'){
      const sub = raw.buildings || raw.items || raw.list || raw.data || null;
      if (Array.isArray(sub)) return sub.map(nor);
      if (sub && typeof sub==='object') return Object.entries(sub).map(([k,v])=>nor(v,k));
      return Object.entries(raw).map(([k,v])=>nor(v,k));
    }
    return [];
  }

  async function fetchBuildingsJSON(){
    const CAND = ['data/buildings.json','./data/buildings.json','../data/buildings.json'];
    for (const url of CAND){
      try{
        const res = await fetch(url, {cache:'no-cache'});
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json)) return json.map(nor);
        if (json && typeof json==='object'){
          const sub = json.buildings || json.items || json.list || json.data || json;
          if (Array.isArray(sub)) return sub.map(nor);
          if (sub && typeof sub==='object') return Object.entries(sub).map(([k,v])=>nor(v,k));
        }
      }catch(_){}
    }
    return [];
  }

  function deriveCategories(list){
    return Array.from(new Set(list.map(x=>x.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
  }
  function getUIBuildCategories(){
    const u = window.UIBuild || window.BuildUI || {};
    const direct = u.categories || u.category || u.menu?.categories || null;
    if (Array.isArray(direct)) return direct.map(toKey).filter(Boolean);
    return null;
  }
  function validate(list){
    const warnings = [];
    const seen = new Set();
    const cats = deriveCategories(list);
    const uicats = getUIBuildCategories();

    for (const it of list){
      if (!it.id) warnings.push({type:'error', msg:`Eintrag ohne ID`, it});
      if (!it.name) warnings.push({type:'warn',  msg:`${it.id}: Name fehlt`, it});
      if (!it.category) warnings.push({type:'warn', msg:`${it.id}: Kategorie fehlt`, it});
      if (!it.size) warnings.push({type:'info',  msg:`${it.id}: Größe unbekannt`, it});
      if (!it.cost || !Object.keys(it.cost).length) warnings.push({type:'info', msg:`${it.id}: Kosten leer`, it});
      const key = (it.id||'').toLowerCase();
      if (seen.has(key)) warnings.push({type:'warn', msg:`Duplikat-ID: ${it.id}`});
      seen.add(key);
    }
    if (uicats){
      const unknown = cats.filter(c => !uicats.includes(c));
      for (const c of unknown) warnings.push({type:'warn', msg:`Kategorie unbekannt im UI-Build: ${c}`});
    }else{
      warnings.push({type:'info', msg:`UI-Build-Kategorien nicht gefunden (optional)`});
    }
    return { warnings, cats, uicats };
  }

  function download(name, blob){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }

  /* --------------------------------- UI ------------------------------------- */
  window.Inspector?.mount?.('build', (host)=>{
    host.innerHTML = `
      <div class="pad">
        <div class="toolbar" style="flex-wrap:wrap;gap:8px">
          <button class="insp-btn" id="b-refresh">Refresh</button>
          <button class="insp-btn" id="b-export">Export JSON</button>
          <button class="insp-btn" id="b-validate">Check Kategorien</button>
          <button class="insp-btn" id="b-buildmenu">Build-Menü öffnen</button>
          <select id="f-cat" class="insp-btn" style="min-width:160px"></select>
          <input id="f-q" class="insp-btn" placeholder="Suche (ID/Titel/Kat.)" style="flex:1;min-width:180px">
          <span id="b-hint" class="hint"></span>
        </div>

        <div id="build-info" class="hint" style="margin-bottom:6px"></div>

        <div id="empty-box" class="warn" style="display:none;margin-bottom:8px">
          <strong>Keine Einträge gefunden.</strong>
          <div style="opacity:.9;margin-top:4px">
            Registry/ UI-Build sind leer <em>und</em> es konnte kein <code>data/buildings.json</code> geladen werden
            (oder es ist leer). Prüfe Pfad & Lade-Reihenfolge. Danach „Refresh“ klicken.
          </div>
        </div>

        <div style="overflow:auto; max-height:55vh; border:1px solid #444; border-radius:6px">
          <table class="inspector-table" id="tbl-build">
            <thead>
              <tr>
                <th data-k="id">ID</th>
                <th data-k="name">Titel</th>
                <th data-k="category">Kategorie</th>
                <th data-k="size">Größe</th>
                <th data-k="cost">Kosten</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div id="val-box" class="hint" style="margin-top:8px"></div>
      </div>
    `;

    const ui = {
      hint:  $('#b-hint', host),
      info:  $('#build-info', host),
      empty: $('#empty-box', host),
      tbody: $('#tbl-build tbody', host),
      catSel: $('#f-cat', host),
      q: $('#f-q', host),
      valBox: $('#val-box', host),
      head: $('#tbl-build thead', host)
    };

    let rows = [];
    let filterCat = '';
    let filterQ = '';
    let sortKey = 'id';
    let sortDir = 1;
    let source = '…';

    async function loadData(){
      // 1) Registry/UI-Build
      const list = harvestRegistry();
      if (list.length){
        source = 'registry/ui-build';
        return list;
      }
      // 2) Fallback: JSON
      const fb = await fetchBuildingsJSON();
      source = 'buildings.json';
      return fb;
    }

    function renderInfo(){
      ui.info.textContent = `Quelle: ${source} (Einträge: ${rows.length})`;
      ui.empty.style.display = rows.length ? 'none' : 'block';
    }
    function renderCatFilter(){
      const cats = Array.from(new Set(rows.map(r=>r.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
      ui.catSel.innerHTML = ['<option value="">(alle Kategorien)</option>']
        .concat(cats.map(c=>`<option value="${c}">${c}</option>`))
        .join('');
    }
    function renderTable(){
      let data = rows.filter(r=>{
        if (filterCat && r.category !== filterCat) return false;
        if (filterQ){
          const q = filterQ.toLowerCase();
          const blob = `${r.id} ${r.name} ${r.category}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }
        return true;
      });
      data.sort((a,b)=>{
        const A=(a[sortKey]??'').toString().toLowerCase();
        const B=(b[sortKey]??'').toString().toLowerCase();
        return A<B?-1*sortDir : A>B? 1*sortDir : 0;
      });
      ui.tbody.innerHTML = data.map(r=>{
        const cost = fmtCost(r.cost);
        const warn = [];
        if (!r.category) warn.push('⚠ Kat.');
        if (!r.size) warn.push('ℹ Größe');
        if (!cost) warn.push('ℹ Kosten');
        return `
          <tr>
            <td><code>${r.id||''}</code></td>
            <td>${r.name||''} ${warn.length?`<span class="hint" style="margin-left:6px">${warn.join(' · ')}</span>`:''}</td>
            <td>${r.category||''}</td>
            <td>${r.size||''}</td>
            <td>${cost||''}</td>
          </tr>`;
      }).join('');
    }
    function renderValidation(){
      const {warnings, cats, uicats} = validate(rows);
      if (!warnings.length){
        ui.valBox.innerHTML = `✅ Keine Probleme gefunden. Kategorien: ${cats.join(', ')}`;
        return;
      }
      const lines = warnings.map(w=>{
        const sym = w.type==='error'?'❌' : w.type==='warn'?'⚠️' : 'ℹ';
        return `${sym} ${w.msg}`;
      });
      const catInfo = `Kategorien (Registry): ${cats.join(', ')}`
        + (uicats ? ` – UI-Build: ${uicats.join(', ')}` : '');
      ui.valBox.innerHTML = `
        <div class="warn" style="margin-top:6px">
          <div><strong>Validierung:</strong></div>
          <div>${lines.join('<br>')}</div>
          <div style="margin-top:6px;opacity:.85">${catInfo}</div>
        </div>`;
    }

    async function doRefresh(){
      ui.hint.textContent='lädt…';
      try{
        rows = await loadData();
        logI('Quelle:', source, 'Einträge:', rows.length);
        renderInfo();
        renderCatFilter();
        renderTable();
      }catch(e){
        logE(e); ui.hint.textContent='Fehler beim Laden';
      }finally{
        setTimeout(()=> ui.hint.textContent='', 1200);
      }
    }
    function doExport(){
      const payload = { ts:new Date().toISOString(), source, count:rows.length,
        items: rows.map(r=>({id:r.id,name:r.name,category:r.category,size:r.size,cost:r.cost})) };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
      download(`build_registry_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`, blob);
      ui.hint.textContent=`exportiert (${rows.length})`;
      setTimeout(()=> ui.hint.textContent='', 1200);
    }
    function doValidate(){ renderValidation(); ui.hint.textContent='Validierung ausgeführt'; setTimeout(()=> ui.hint.textContent='', 1200); }
    function openBuildMenu(){ window.dispatchEvent(new Event('req:buildmenu:show')); ui.hint.textContent='Build-Menü angefordert'; setTimeout(()=> ui.hint.textContent='',1200); }

    ui.head.addEventListener('click', e=>{
      const th=e.target.closest('th'); if(!th) return;
      const k=th.dataset.k; if(!k) return;
      if (sortKey===k) sortDir*=-1; else { sortKey=k; sortDir=1; }
      renderTable();
    });
    ui.catSel.addEventListener('change', ()=>{ filterCat=ui.catSel.value; renderTable(); });
    ui.q.addEventListener('input', ()=>{ filterQ=ui.q.value.trim(); renderTable(); });

    $('#b-refresh', host).addEventListener('click', doRefresh);
    $('#b-export', host).addEventListener('click', doExport);
    $('#b-validate', host).addEventListener('click', doValidate);
    $('#b-buildmenu', host).addEventListener('click', openBuildMenu);

    window.addEventListener('cb:registry:ready', doRefresh);
    window.addEventListener('cb:registry:snapshot', doRefresh);
    window.addEventListener('cb:insp:tab:change', e=>{ if (e.detail?.tab==='build') doRefresh(); });

    // Debug-Hook
    (window.__inspBuild = window.__inspBuild || {}).refresh = doRefresh;

    doRefresh();
    logO('bereit v18.15.1');
  });
})();
