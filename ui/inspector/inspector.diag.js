/* ============================================================================
 * Datei   : ui/inspector/inspector.diag.js
 * Projekt : Neue Siedler – Inspector (Diag-Tab)
 * Version : v25.10.27-diag1
 * Zweck   : Diagnose-Tab mit Start-/Boot-Infos, Registry-/Assets-/Map-Snapshot
 *           sowie Live-Res-Übersicht und Schnellaktionen.
 *
 * Abhängigkeiten:
 *   - inspector.core.js (>= v18.16.3) – liefert generic-view Slot & API
 *   - core/diag.boot.js (optional)     – sendet cb:diag:boot-snapshot
 *   - core/registry.js                 – snapshot(), data-Spiegel
 *
 * Lauscht :
 *   - cb:diag:boot-snapshot { counts, assets, map, meta }
 *   - cb:registry:ready
 *   - cb:res:snapshot       { resources }
 *   - cb:insp:tab:change    (zum Aufräumen)
 *
 * Sendet :
 *   - req:res:snapshot
 *   - req:registry:snapshot
 *   - cb:insp:console (nur wenn Fehler in diesem Modul auftreten)
 *
 * Einbindung:
 *   <script src="ui/inspector/inspector.diag.js"></script>
 *
 * UI:
 *   [ Snapshot-Werte ] [ Buttons: Refresh/Req Snapshot ]
 *   ├─ Registry (counts + meta)
 *   ├─ Assets   (json/img)
 *   ├─ Map      (size, tile)
 *   └─ Ressourcen (Tabelle live, aus cb:res:snapshot)
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.diag]'; const VER='v25.10.27-diag1';
  const LOG = (window.CBLog?.info || console.info).bind(console, MOD);
  const OK  = (window.CBLog?.ok   || console.log ).bind(console, MOD);
  const WRN = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const ERR = (window.CBLog?.err  || console.error).bind(console, MOD);

  // ---- Core-Bridge (funktioniert mit split core oder klassischem Inspector) ----
  const core = (function(){
    if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;
    const ins = window.Inspector || window.__INSPECTOR__ || {};
    return {
      mount(id,onShow){ return (ins.registerTab||ins.addTab||function(){ })({ id, title:id, onShow }); },
      getSlot(name){
        return document.querySelector(`#inspector [data-slot="${name}"]`)
            || document.querySelector(`[data-inspector-slot="${name}"]`)
            || document.getElementById(`ins-${name}`)
            || document.getElementById(name);
      }
    };
  })();

  // ---- DOM-Helfer ------------------------------------------------------------
  const $ = (s,sc=document)=> sc.querySelector(s);
  function el(tag, cls, html){
    const n=document.createElement(tag); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n;
  }

  // ---- State -----------------------------------------------------------------
  const state = {
    lastBoot : null,     // { counts, assets, map, meta }
    resMap   : {},       // { id: value }
    mounted  : false,
    timer    : 0
  };

  // ---- Kleine Renderer -------------------------------------------------------
  function kvTable(obj, order){
    const tbl = el('table','inspector-table');
    const head = el('thead',null,'<tr><th>Key</th><th>Value</th></tr>');
    const body = el('tbody');
    const keys = order ? order.filter(k=>k in obj) : Object.keys(obj||{});
    keys.forEach(k=>{
      const tr = el('tr',null,`<td class="pad"><code>${k}</code></td><td class="pad">${safe(obj[k])}</td>`);
      body.appendChild(tr);
    });
    tbl.append(head, body);
    return tbl;
  }
  function safe(v){
    if (v==null) return '—';
    if (typeof v==='object') return Array.isArray(v) ? `[${v.length}]` : JSON.stringify(v);
    return String(v);
  }
  function resTable(map){
    const tbl = el('table','inspector-table');
    const head = el('thead',null,'<tr><th>Res</th><th style="width:120px;text-align:right">Menge</th></tr>');
    const body = el('tbody');
    const ids = Object.keys(map||{}).sort((a,b)=>a.localeCompare(b));
    ids.forEach(id=>{
      const val = Number(map[id]||0);
      const tr = el('tr');
      tr.innerHTML = `<td class="pad"><code>${id}</code></td><td class="pad" style="text-align:right">${val}</td>`;
      body.appendChild(tr);
    });
    tbl.append(head,body);
    return tbl;
  }

  // ---- View-Bau --------------------------------------------------------------
  function buildView(host){
    host.innerHTML = '';
    const wrap = el('div','pad');

    // Kopfzeile + Toolbar
    const h = el('h3',null,'Diag / Boot-Snapshot');
    const bar = el('div','toolbar');
    const bReqRes  = el('button','insp-btn','res: snapshot');
    const bReqReg  = el('button','insp-btn','registry: snapshot');
    const bRefresh = el('button','insp-btn','Refresh');

    bReqRes.addEventListener('click', ()=> dispatchEvent(new Event('req:res:snapshot')));
    bReqReg.addEventListener('click', ()=> dispatchEvent(new Event('req:registry:snapshot')));
    bRefresh.addEventListener('click', ()=> renderAll(host));

    bar.append(bReqRes, bReqReg, bRefresh);

    // Sektionen
    const boxRegistry = el('div'); // Registry counts + meta
    const boxAssets   = el('div'); // Assets stats
    const boxMap      = el('div'); // Map info
    const boxRes      = el('div'); // Ressourcen live

    wrap.append(h, bar,
      el('h4',null,'Registry'),
      boxRegistry,
      el('h4',null,'Assets'),
      boxAssets,
      el('h4',null,'Map'),
      boxMap,
      el('h4',null,'Ressourcen (live)'),
      boxRes
    );

    host.appendChild(wrap);

    // Render-Funktionen binden
    host._renderDiag = function(){
      try{
        // Registry
        const meta = state.lastBoot?.meta || {};
        const counts = state.lastBoot?.counts || {
          buildings: window.Registry?.data?.buildings?.length||0,
          units    : window.Registry?.data?.units?.length||0,
          resources: Array.isArray(window.Registry?.data?.resources)
                     ? window.Registry.data.resources.length
                     : Object.keys(window.Registry?.data?.resources||{}).length
        };
        boxRegistry.innerHTML='';
        boxRegistry.appendChild( kvTable(counts, ['buildings','units','resources']) );
        // ein paar Meta-Felder, falls vorhanden
        if (meta && Object.keys(meta).length){
          const t = kvTable(meta, ['categories','iconsBase']);
          t.querySelector('thead tr th:last-child').textContent='Meta';
          boxRegistry.appendChild(t);
        }

        // Assets
        const assets = state.lastBoot?.assets || (window.Assets?.stats?.() || { json:0, img:0 });
        boxAssets.innerHTML='';
        boxAssets.appendChild( kvTable(assets, ['json','img']) );

        // Map
        const map = state.lastBoot?.map || (window.MapRuntime?.info?.() || {});
        boxMap.innerHTML='';
        boxMap.appendChild( kvTable(map, ['name','width','height','tile','seed']) );

        // Ressourcen
        boxRes.innerHTML='';
        boxRes.appendChild( resTable(state.resMap) );
      }catch(e){
        ERR('renderDiag', e?.message || e);
        dispatchEvent(new CustomEvent('cb:insp:console',{detail:{type:'error',msg:String(e)}}));
      }
    };

    // Initial render
    host._renderDiag();
  }

  function renderAll(host){
    // hole, was wir lokal wissen
    try{
      // wenn noch kein Boot-Snapshot da ist, ggf. lokal erzeugen
      if (!state.lastBoot && window.Registry?.snapshot){
        const snap = window.Registry.snapshot();
        state.lastBoot = {
          counts : {
            buildings: snap.data?.buildings?.length||0,
            units    : snap.data?.units?.length||0,
            resources: Array.isArray(snap.data?.resources)
                      ? snap.data.resources.length
                      : Object.keys(snap.data?.resources||{}).length
          },
          assets : window.Assets?.stats?.() || { json:0, img:0 },
          map    : window.MapRuntime?.info?.() || {},
          meta   : snap.meta||{}
        };
      }
    }catch(_){}
    host._renderDiag?.();
  }

  // ---- Subscriptions ---------------------------------------------------------
  function onBootSnapshot(e){
    // e.detail: { counts, assets, map, meta }
    state.lastBoot = e?.detail || null;
    // Live neu zeichnen – nur wenn der Tab sichtbar ist
    renderIfActive('diag');
  }
  function onResSnapshot(e){
    const map = e?.detail?.resources || e?.detail || {};
    state.resMap = Object.assign({}, map);
    renderIfActive('diag');
  }

  function renderIfActive(tabId){
    const active = document.querySelector('#inspector .insp-tab.active')?.dataset?.tab;
    if (active === tabId){
      const host = core.getSlot('generic') || core.getSlot('view');
      host?._renderDiag?.();
    }
  }

  // ---- Mount im Inspector ----------------------------------------------------
  core.mount('diag', (host)=>{
    // sicherstellen, dass wir im generic-view landen (core >= 18.16.3)
    if (host && !host.closest || !host.closest('.insp-content')) {
      // Fallback: forcieren
      host = core.getSlot('generic') || host;
    }
    buildView(host);
    renderAll(host);

    // leichte Auto-Refreshes (Counts können sich durch Upserts ändern)
    clearInterval(state.timer);
    state.timer = setInterval(()=> renderAll(host), 1500);

    OK('bereit', VER);
  });

  // ---- Global Event-Hooks ----------------------------------------------------
  window.addEventListener('cb:diag:boot-snapshot', onBootSnapshot);
  window.addEventListener('cb:res:snapshot',       onResSnapshot);

  window.addEventListener('cb:registry:ready', ()=> {
    // nach registry-ready sofort Werte ziehen
    try{
      const snap = window.Registry?.snapshot?.();
      if (snap){
        state.lastBoot = {
          counts : {
            buildings: snap.data?.buildings?.length||0,
            units    : snap.data?.units?.length||0,
            resources: Array.isArray(snap.data?.resources)
                      ? snap.data.resources.length
                      : Object.keys(snap.data?.resources||{}).length
          },
          assets : window.Assets?.stats?.() || { json:0, img:0 },
          map    : window.MapRuntime?.info?.() || {},
          meta   : snap.meta||{}
        };
      }
    }catch(_){}
    // gleich auch Ressourcen anfragen
    dispatchEvent(new Event('req:res:snapshot'));
  });

  // Aufräumen, wenn Tab gewechselt wird → Timer stoppen
  window.addEventListener('cb:insp:tab:change', (e)=>{
    if (e?.detail?.tab !== 'diag') {
      clearInterval(state.timer); state.timer = 0;
    }
  });
})();
