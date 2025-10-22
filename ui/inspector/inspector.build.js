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
(function(){
  'use strict';
  const MOD = '[inspector.build]';
  const logI = (window.CBLog?.info || console.info).bind(console, MOD);
  const logO = (window.CBLog?.ok   || console.log ).bind(console, MOD);
  const logW = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const logE = (window.CBLog?.error|| console.error).bind(console, MOD);

  /* ----------------------------- Hilfsfunktionen ----------------------------- */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function asArray(x){ return Array.isArray(x) ? x : (x ? [x] : []); }
  function toKey(x){ return String(x||'').trim(); }

  // Schönformatierung von Kosten-Objekten: { wood:2, stone:1 } -> "wood:2, stone:1"
  function fmtCost(cost){
    if (!cost || typeof cost !== 'object') return '';
    const pairs = [];
    for (const [k,v] of Object.entries(cost)){
      if (v==null || v===0) continue;
      pairs.push(`${k}:${v}`);
    }
    return pairs.join(', ');
  }

  // Größe erkennen: unterstützt size:{w,h} | w/h | footprint:{w,h} | size:"3x2"
  function extractSize(e){
    if (!e) return '';
    const s = e.size || e.footprint || null;
    if (s && typeof s === 'object'){
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

  // Kanonische Projektstruktur tolerant auslesen
  function getRegistryRaw(){
    const R = window.Registry || window.BuildRegistry || window.registry || {};
    return (
      R.buildings ||
      R.data?.buildings ||
      (typeof R.get === 'function' && R.get('buildings')) ||
      R // worst case – später heuristisch durchsucht
    );
  }

  // Registry in flache, gut nutzbare Listeneinträge mappen
  function harvestRegistry(){
    const raw = getRegistryRaw();

    // Struktur-Varianten:
    // 1) Array von Einträgen
    if (Array.isArray(raw)){
      return raw.map(nor);
    }

    // 2) Map/Object mit Keys
    if (raw && typeof raw === 'object'){
      // Wenn "buildings" als Objekt unterhalb liegt
      const sub = raw.buildings || raw.items || raw.list || raw.data || raw;
      if (Array.isArray(sub)) return sub.map(nor);
      if (sub && typeof sub === 'object'){
        return Object.entries(sub).map(([k,v])=> nor(v, k));
      }
    }

    // 3) Nichts bekannt
    return [];
  }

  // Normalisierung eines Eintrags in unser Anzeigeformat
  function nor(entry, fallbackKey){
    entry = entry || {};
    const id   = toKey(entry.id || entry.key || fallbackKey || entry.name || entry.title);
    const name = toKey(entry.title || entry.name || id);
    const cat  = toKey(entry.category || entry.cat || entry.group);
    const cost = entry.cost || entry.price || entry.requirements?.cost || entry.resources || null;
    const size = extractSize(entry);
    const icon = entry.icon || entry.sprite || entry.img || '';
    return {
      id, name, category: cat, size, cost, icon,
      _src: entry // für Export/Details
    };
  }

  // Fallback: buildings.json laden (nur Anzeige, nicht in Registry schreiben)
  async function fetchBuildingsJSON(){
    const CANDIDATES = [
      'data/buildings.json',                // Standard
      './data/buildings.json',
      '../data/buildings.json'
    ];
    for (const url of CANDIDATES){
      try{
        const res = await fetch(url, { cache:'no-cache' });
        if (res.ok){
          const json = await res.json();
          // kann array oder object sein
          if (Array.isArray(json)) return json.map(nor);
          if (json && typeof json === 'object'){
            const sub = json.buildings || json.items || json.list || json.data || json;
            if (Array.isArray(sub)) return sub.map(nor);
            if (sub && typeof sub === 'object') return Object.entries(sub).map(([k,v])=> nor(v,k));
          }
        }
      }catch(_){}
    }
    return [];
  }

  // Kategorien aus List ableiten
  function deriveCategories(list){
    return Array.from(new Set(list.map(x => x.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
  }

  // Kategorien aus UI-Build (falls vorhanden)
  function getUIBuildCategories(){
    // mögliche Objekte
    const u = window.UIBuild || window.BuildUI || {};
    // z. B. { categories:['housing','production',...]} | { menu:{categories:[...]}}
    const direct = u.categories || u.category || u.menu?.categories || null;
    if (Array.isArray(direct)) return direct.map(toKey).filter(Boolean);
    return null;
  }

  // Validierung
  function validate(list){
    const warnings = [];
    const seen = new Set();
    const cats = deriveCategories(list);
    const uicats = getUIBuildCategories();

    for (const it of list){
      if (!it.id) warnings.push({ type:'error',  msg:`Eintrag ohne ID`, it });
      if (!it.name) warnings.push({ type:'warn', msg:`${it.id}: Name fehlt`, it });
      if (!it.category) warnings.push({ type:'warn', msg:`${it.id}: Kategorie fehlt`, it });
      if (!it.size) warnings.push({ type:'info', msg:`${it.id}: Größe unbekannt`, it });
      if (!it.cost || !Object.keys(it.cost).length) warnings.push({ type:'info', msg:`${it.id}: Kosten leer`, it });

      const key = it.id.toLowerCase();
      if (seen.has(key)) warnings.push({ type:'warn', msg:`Duplikat-ID: ${it.id}`, it });
      seen.add(key);
    }

    // Kategorien gegen UI-Build vergleichen
    if (uicats){
      const unknown = cats.filter(c => !uicats.includes(c));
      for (const c of unknown){
        warnings.push({ type:'warn', msg:`Kategorie unbekannt im UI-Build: ${c}` });
      }
    }else{
      warnings.push({ type:'info', msg:`UI-Build-Kategorien nicht gefunden (optional)` });
    }

    return { warnings, cats, uicats };
  }

  // CSV/JSON Export-Helfer
  function download(name, blob){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  /* ------------------------------- UI Rendering ------------------------------ */
  window.Inspector?.mount?.('build', (host)=>{
    // Grundgerüst
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
      hint: $('#b-hint', host),
      info: $('#build-info', host),
      tbody: $('#tbl-build tbody', host),
      catSel: $('#f-cat', host),
      q: $('#f-q', host),
      valBox: $('#val-box', host),
      head: $('#tbl-build thead', host)
    };

    // Zustand
    let rows = [];            // normale Liste (aus Registry/JSON)
    let filterCat = '';
    let filterQ = '';
    let sortKey = 'id';
    let sortDir = 1;          // 1 = asc, -1 = desc
    let source = 'registry';  // 'registry' | 'fallback'

    // Datenbeschaffung (Registry bevorzugt, sonst JSON)
    async function loadData(){
      const list = harvestRegistry();
      if (list.length){
        source = 'registry';
        return list;
      }
      const fb = await fetchBuildingsJSON();
      source = 'fallback';
      return fb;
    }

    // Tabelle rendern
    function renderTable(){
      // Filter
      let data = rows.filter(r=>{
        if (filterCat && r.category !== filterCat) return false;
        if (filterQ){
          const q = filterQ.toLowerCase();
          const blob = `${r.id} ${r.name} ${r.category}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }
        return true;
      });

      // Sort
      data.sort((a,b)=>{
        const A = (a[sortKey] ?? '').toString().toLowerCase();
        const B = (b[sortKey] ?? '').toString().toLowerCase();
        return A < B ? -1*sortDir : A > B ? 1*sortDir : 0;
      });

      // Body
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

    // Kategorie-Filter füllen
    function renderCatFilter(){
      const cats = deriveCategories(rows);
      const opts = ['<option value="">(alle Kategorien)</option>']
        .concat(cats.map(c=>`<option value="${c}">${c}</option>`));
      ui.catSel.innerHTML = opts.join('');
    }

    // Infozeile aktualisieren
    function renderInfo(){
      ui.info.textContent = source === 'registry'
        ? `Quelle: Registry (Einträge: ${rows.length})`
        : `Quelle: data/buildings.json (Einträge: ${rows.length})`;
    }

    // Validierung anzeigen
    function renderValidation(){
      const { warnings, cats, uicats } = validate(rows);
      if (!warnings.length){
        ui.valBox.innerHTML = `✅ Keine Probleme gefunden. Kategorien: ${cats.join(', ')}`;
        return;
      }
      const lines = warnings.map(w=>{
        const sym = w.type==='error' ? '❌' : w.type==='warn' ? '⚠️' : 'ℹ';
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

    // Toolbar-Aktionen
    async function doRefresh(){
      ui.hint.textContent = 'lädt…';
      try{
        rows = await loadData();
        renderInfo();
        renderCatFilter();
        renderTable();
        ui.hint.textContent = 'aktualisiert';
      }catch(e){
        ui.hint.textContent = 'Fehler beim Laden';
        logE(e);
      }finally{
        setTimeout(()=> ui.hint.textContent='', 1200);
      }
    }

    function doExport(){
      const payload = {
        ts: new Date().toISOString(),
        source,
        count: rows.length,
        items: rows.map(r => ({
          id: r.id, name: r.name, category: r.category, size: r.size, cost: r.cost
        }))
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const name = `build_registry_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
      download(name, blob);
      ui.hint.textContent = `exportiert (${rows.length})`;
      setTimeout(()=> ui.hint.textContent='', 1500);
    }

    function doValidate(){
      renderValidation();
      ui.hint.textContent = 'Validierung ausgeführt';
      setTimeout(()=> ui.hint.textContent='', 1200);
    }

    function openBuildMenu(){
      // So war deine Bridge im UI-Build benannt; wenn vorhanden, reagiert die UI
      window.dispatchEvent(new Event('req:buildmenu:show'));
      ui.hint.textContent = 'Build-Menü angefordert';
      setTimeout(()=> ui.hint.textContent='', 1200);
    }

    // Sort-Handler
    ui.head.addEventListener('click', (ev)=>{
      const th = ev.target.closest('th'); if (!th) return;
      const k = th.dataset.k; if (!k) return;
      if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = 1; }
      renderTable();
    });

    // Filter/ Suche
    ui.catSel.addEventListener('change', ()=>{
      filterCat = ui.catSel.value;
      renderTable();
    });
    ui.q.addEventListener('input', ()=>{
      filterQ = ui.q.value.trim();
      renderTable();
    });

    // Buttons
    $('#b-refresh', host).addEventListener('click', doRefresh);
    $('#b-export', host).addEventListener('click', doExport);
    $('#b-validate', host).addEventListener('click', doValidate);
    $('#b-buildmenu', host).addEventListener('click', openBuildMenu);

    // Auto-Refresh, wenn Registry bereit/snapshot
    window.addEventListener('cb:registry:ready', doRefresh);
    window.addEventListener('cb:registry:snapshot', doRefresh);

    // Optional: Snapshot anfordern (falls unterstützt)
    // $('#b-snapshot', host) -> könntest du ergänzen:
    // window.dispatchEvent(new Event('req:registry:snapshot'));

    // Initial
    doRefresh();
    logO('bereit v18.15.0');
  });

})();
