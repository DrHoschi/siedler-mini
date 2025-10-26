/* ============================================================================
 * Datei   : ui/inspector/inspector.build.js
 * Projekt : Neue Siedler – Inspector (Build-Tab)
 * Version : v25.10.28-final
 * Zweck   : Entwicklertab für Gebäude-/Registry-Daten
 *
 * Features:
 *   • Daten robust aus window.Registry (Fallback: data/buildings.json)
 *   • Suche / Kategorie-Filter / Sortierung
 *   • Validierung (fehlende Felder, Duplikate)
 *   • Export (sichtbarer Zustand in JSON)
 *   • Build-Menü per Event anfordern
 *   • Header mit „×“-Button (Inspector schließen)
 *
 * Lebenszyklus:
 *   • registriert sich über kompatibles core.mount('build', render)
 *   • reagiert auf cb:registry:ready / cb:registry:snapshot / Tabwechsel
 *
 * Hinweise:
 *   • Keine Alt-API (kein window.UIBuild, kein #build-panel)
 *   • Zeichnet ausschließlich in den vom Core gelieferten host
 * ========================================================================== */
(function () {
  'use strict';

  const TAG='[inspector.build]';
  const LOG = (window.CBLog?.info  || console.info ).bind(console, TAG);
  const OK  = (window.CBLog?.ok    || console.log  ).bind(console, TAG);
  const WRN = (window.CBLog?.warn  || console.warn ).bind(console, TAG);
  const ERR = (window.CBLog?.error || console.error).bind(console, TAG);

  // --- Core-Bridge (kompatibel zu allen Varianten) ---------------------------
  const mount = (window.__INSPECTOR_CORE__?.api?.mount
              || window.Inspector?.mount
              || window.UIInspector?.mount);
  if (!mount) { WRN('Kein Inspector-Core gefunden – Tab wird nicht registriert'); return; }

  // --- kleine DOM-Helper -----------------------------------------------------
  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  // =========================== [HILFSFUNKTIONEN] =============================

  // String-Helper (sichere Schlüssel)
  const toKey = v => String(v ?? '').trim();

  // Kosten-Objekt in kurze Textform (holz:2, stein:1 …)
  function fmtCost(cost){
    if (!cost || typeof cost!=='object') return '';
    const out=[]; for (const [k,v] of Object.entries(cost)){ if (v) out.push(`${k}:${v}`); }
    return out.join(', ');
  }

  // Größe aus diversen Feldern ableiten (size:{w,h} | w/h | "WxH")
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

  // Anzeige-Objekt aus beliebigem Registry/JSON-Eintrag erzeugen
  function normalize(entry, fallbackKey){
    entry = entry || {};
    const id   = toKey(entry.id || entry.key || fallbackKey || entry.name || entry.title);
    const name = toKey(entry.title || entry.name || id);
    const cat  = toKey(entry.category || entry.cat || entry.group);
    const cost = entry.cost || entry.price || entry.requirements?.cost || entry.resources || null;
    const size = extractSize(entry);
    const icon = entry.icon || entry.sprite || entry.img || '';
    return { id, name, category:cat, size, cost, icon, _raw: entry };
  }

  // Buildings robust aus Registry ermitteln (verschiedene Strukturen)
  function harvestFromRegistry(){
    const R = window.Registry || window.BuildRegistry || window.registry || {};
    if (Array.isArray(R.buildings)) return R.buildings.map(normalize);
    if (R.data?.buildings){
      const b = R.data.buildings;
      if (Array.isArray(b)) return b.map(normalize);
      if (typeof b==='object') return Object.entries(b).map(([k,v])=>normalize(v,k));
    }
    if (typeof R==='object'){
      const sub = R.buildings || R.items || R.list || R.data || null;
      if (Array.isArray(sub)) return sub.map(normalize);
      if (sub && typeof sub==='object') return Object.entries(sub).map(([k,v])=>normalize(v,k));
    }
    return [];
  }

  // Fallback: data/buildings.json (readonly-Ansicht)
  async function fetchBuildingsJSON(){
    const CAND = ['data/buildings.json','./data/buildings.json','../data/buildings.json'];
    for (const url of CAND){
      try{
        const res = await fetch(url, { cache:'no-cache' });
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json)) return json.map(normalize);
        if (json && typeof json==='object'){
          const sub = json.buildings || json.items || json.list || json.data || json;
          if (Array.isArray(sub)) return sub.map(normalize);
          if (sub && typeof sub==='object') return Object.entries(sub).map(([k,v])=>normalize(v,k));
        }
      }catch(_){}
    }
    return [];
  }

  // Validierung (Duplikate, fehlende Angaben) – liefert Meldungen + Kategorien
  function validate(list){
    const warnings = [];
    const seen = new Set();
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
    // Kategorienliste (nur Info)
    const cats = Array.from(new Set(list.map(x=>x.category).filter(Boolean)))
      .sort((a,b)=>a.localeCompare(b));
    return { warnings, cats };
  }

  // Download-Helfer (Blob → Datei)
  function download(name, blob){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }

  // ============================== [RENDERER] =================================
  function renderBuildTab(host){
    // --- Grundgerüst: Frame / Header (mit X) / Content ----------------------
    host.innerHTML = `
      <div class="insp-frame">
        <div class="insp-header">
          <h3>Build / Gebäude</h3>
          <button class="insp-close" title="Inspector schließen">×</button>
        </div>

        <div class="insp-content">
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
                Registry ist leer <em>und</em> es konnte kein <code>data/buildings.json</code> geladen werden.
                Prüfe Pfad & Lade-Reihenfolge. Danach „Refresh“ klicken.
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
        </div>
      </div>
    `;

    // --- Close-Button im Header ---------------------------------------------
    $('.insp-close', host)?.addEventListener('click', ()=> window.Inspector?.close());

    // --- UI-Refs -------------------------------------------------------------
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

    // --- Zustand -------------------------------------------------------------
    let rows = [];
    let filterCat = '';
    let filterQ = '';
    let sortKey = 'id';
    let sortDir = 1;    // 1: asc, -1: desc
    let source = '…';

    // --- Render-Funktionen ---------------------------------------------------
    function renderInfo(){
      ui.info.textContent = `Quelle: ${source} (Einträge: ${rows.length})`;
      ui.empty.style.display = rows.length ? 'none' : 'block';
    }

    function renderCatFilter(){
      const cats = Array.from(new Set(rows.map(r=>r.category).filter(Boolean)))
        .sort((a,b)=>a.localeCompare(b));
      ui.catSel.innerHTML = ['<option value="">(alle Kategorien)</option>']
        .concat(cats.map(c=>`<option value="${c}">${c}</option>`))
        .join('');
      // Filter beibehalten, wenn möglich
      if (filterCat) {
        const opt = ui.catSel.querySelector(`option[value="${filterCat}"]`);
        if (opt) ui.catSel.value = filterCat; else filterCat='';
      }
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
      const {warnings, cats} = validate(rows);
      if (!warnings.length){
        ui.valBox.innerHTML = `✅ Keine Probleme gefunden. Kategorien: ${cats.join(', ')}`;
        return;
      }
      const lines = warnings.map(w=>{
        const sym = w.type==='error'?'❌' : w.type==='warn'?'⚠️' : 'ℹ';
        return `${sym} ${w.msg}`;
      });
      ui.valBox.innerHTML = `
        <div class="warn" style="margin-top:6px">
          <div><strong>Validierung:</strong></div>
          <div>${lines.join('<br>')}</div>
          <div style="margin-top:6px;opacity:.85">Kategorien (Registry): ${cats.join(', ')}</div>
        </div>`;
    }

    // --- Daten laden ---------------------------------------------------------
    async function loadData(){
      const list = harvestFromRegistry();
      if (list.length){ source='registry'; return list; }
      const fb = await fetchBuildingsJSON();
      source = 'buildings.json';
      return fb;
    }

    // --- Aktionen ------------------------------------------------------------
    async function doRefresh(){
      ui.hint.textContent='lädt…';
      try{
        rows = await loadData();
        LOG('Quelle:', source, 'Einträge:', rows.length);
        renderInfo();
        renderCatFilter();
        renderTable();
      }catch(e){
        ERR(e); ui.hint.textContent='Fehler beim Laden';
      }finally{
        setTimeout(()=> ui.hint.textContent='', 1200);
      }
    }

    function doExport(){
      const payload = {
        ts: new Date().toISOString(),
        source, count: rows.length,
        items: rows.map(r=>({id:r.id,name:r.name,category:r.category,size:r.size,cost:r.cost}))
      };
      const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
      download(`build_registry_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`, blob);
      ui.hint.textContent=`exportiert (${rows.length})`;
      setTimeout(()=> ui.hint.textContent='', 1200);
    }

    function doValidate(){
      renderValidation();
      ui.hint.textContent='Validierung ausgeführt';
      setTimeout(()=> ui.hint.textContent='', 1200);
    }

    function openBuildMenu(){
      // dein Event-Name aus der bisherigen Datei
      dispatchEvent(new Event('req:buildmenu:show'));
      ui.hint.textContent='Build-Menü angefordert';
      setTimeout(()=> ui.hint.textContent='',1200);
    }

    // --- UI-Events -----------------------------------------------------------
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

    // --- System-Events (auto-refresh) ---------------------------------------
    addEventListener('cb:registry:ready', doRefresh);
    addEventListener('cb:registry:snapshot', doRefresh);
    addEventListener('cb:insp:tab:change', e=>{
      if ((e.detail?.tab||'') === 'build') doRefresh();
    });

    // --- Debug/Dev-Hook ------------------------------------------------------
    (window.__inspBuild = window.__inspBuild || {}).refresh = doRefresh;

    // --- Initial-Load --------------------------------------------------------
    doRefresh();
    OK('bereit v25.10.28-final');
  }

  // ============================ [REGISTRIERUNG] ==============================
  mount('build', renderBuildTab);
})();
