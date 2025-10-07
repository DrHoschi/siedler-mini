/* ============================================================================
 * Datei    : ui/ui-hud.js
 * Projekt  : Neue Siedler
 * Version  : v23.0.0 (2025-10-07)
 * Modul    : Ressourcen-HUD (oben andockend, 1-zeilig; bei kleinen Screens 2-zeilig)
 *
 * Events (listen)
 *   - cb:registry:ready
 *   - cb:ui-ready
 *   - cb:res:change   {res|id, delta? , amount?}  // +/− oder absolute Menge
 *   - cb:res:reset    {scope:'all'|'one', res?}
 *   - cb:res:snapshot {amounts:{<resId>:number}}
 *
 * Events (emit)
 *   - cb:hud-ready                { ok:true }
 *   - req:res:snapshot            {}         // Core kann daraufhin cb:res:snapshot senden
 *   - req:res:focus               { resId, active } // Klick auf Ressourcenkachel (für Producer/Consumer-Highlight)
 *   - cb:hud:res:focus            { resId, active } // UI-Bestätigung
 *
 * Abhängigkeiten
 *   - (optional) core/registry.js → Registry.list('resources' | 'resource' | 'goods' | 'materials')
 *   - Icons unter assets/icons/resources/<id>.png
 *   - Styling in ui/css/ui-hud.css (Panelrahmen je Kachel via --hud-panel-img)
 *
 * Changelog
 *   v23.0.0
 *     - robuste Registry-Erkennung + Gebäude-Filter
 *     - klare DOM-Struktur: Titel oben links, Icon mittig, Menge unten rechts
 *     - Deduplizierte Appends, sauberes Event-Wiring, Snapshot-Support
 * ========================================================================== */

(function(){
  'use strict';

  // -------------------------------------------------------------------------
  // [00] DOM/Logging/Utils
  // -------------------------------------------------------------------------
  const $root = document.getElementById('hud-top');
  if (!$root){ (console.error)('[hud] #hud-top fehlt'); return; }

  const log = {
    ok  : (...a)=>(window.CBLog?.ok   || console.log )('[hud]', ...a),
    inf : (...a)=>(window.CBLog?.info || console.info)('[hud]', ...a),
    wrn : (...a)=>(window.CBLog?.warn || console.warn)('[hud]', ...a),
    err : (...a)=>(window.CBLog?.err  || console.error)('[hud]', ...a),
  };

  const emit = (name, detail={}) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  const nf = (n)=>{
    try { return new Intl.NumberFormat('de-DE').format(n|0); }
    catch(_) { return String(n|0); }
  };

  // -------------------------------------------------------------------------
  // [01] Katalog (Registry → Ressourcenliste) + Fallback
  // -------------------------------------------------------------------------
  const SHOW_ALL_RESOURCES = true;                // alles zeigen, auch spätere Epochen
  const currentEpoche = (window.Game?.epoche) || 1;

  // Minimaler Fallback, falls Registry leer/nicht vorhanden
  const FALLBACK_RES = [
    { id:'wood',        name:'Holz',        epoche:1 },
    { id:'stone',       name:'Stein',       epoche:1 },
    { id:'fish',        name:'Fisch',       epoche:1 },
    { id:'gold',        name:'Gold',        epoche:1 },
    { id:'population',  name:'Bevölkerung', epoche:1 },
    { id:'bread',       name:'Brot',        epoche:2 },
    { id:'tools',       name:'Werkzeuge',   epoche:3 },
  ];

  const iconFor = (id) => `assets/icons/resources/${id}.png`;

  // Heuristik: Alles was wie Gebäude aussieht (cost/size/category/type==='building') rausfiltern
  const looksLikeBuilding = (o) =>
    !!(o && (o.cost || o.size || o.category || o.type === 'building'));

  function getResourceCatalog(){
    let reg = [];
    if (typeof window.Registry?.list === 'function'){
      reg = Registry.list('resources')
         || Registry.list('resource')
         || Registry.list('goods')
         || Registry.list('materials')
         || [];
    }

    // Positivfilter (falls vorhanden) bevorzugen …
    let items = (reg || []).filter(o => o && (o.type === 'resource' || o.kind === 'resource'));
    // … sonst Heuristik gegen Gebäude anwenden
    if (!items.length) items = (reg || []).filter(o => !looksLikeBuilding(o));

    // Fallback, wenn immer noch leer
    if (!items.length) items = FALLBACK_RES;

    // Normalisieren + sortieren
    const normalized = items.map(r => ({
      id    : r.id,
      name  : r.name || r.id,
      icon  : r.icon || iconFor(r.id),
      epoche: r.epoche || 1,
      order : r.order ?? 999
    }));

    return normalized
      .filter(r => SHOW_ALL_RESOURCES || r.epoche <= currentEpoche)
      .sort((a,b)=>(a.order||999)-(b.order||999));
  }

  // -------------------------------------------------------------------------
  // [02] View: Aufbau & Aktualisierung
  // -------------------------------------------------------------------------
  let $grid = null;
  const amounts = new Map();   // id -> number
  const cards   = new Map();   // id -> { el, $amt }

  function buildHUD(){
    const catalog = getResourceCatalog();

    // Root leeren & Grid anlegen
    $root.innerHTML = '';
    $grid = document.createElement('div');
    $grid.className = 'hud-grid';
    $root.appendChild($grid);

    // Kacheln erzeugen
    catalog.forEach(r=>{
      const el = document.createElement('button');
      el.className   = 'res-card';
      el.dataset.res = r.id;
      el.title       = r.name;

      // Titel (oben links)
      const $title = document.createElement('span');
      $title.className = 'res-title';
      $title.textContent = r.name || r.id;
      el.setAttribute('data-name', $title.textContent);
      el.appendChild($title);

      // Icon (mittig)
      const $icon = document.createElement('img');
      $icon.className = 'res-icon';
      $icon.src = r.icon || iconFor(r.id);
      $icon.alt = $title.textContent;
      el.appendChild($icon);

      // Menge (unten rechts)
      const $amt = document.createElement('span');
      $amt.className = 'res-amount';
      $amt.id = `hud-${r.id}`;
      $amt.textContent = nf(amounts.get(r.id) || 0);
      el.appendChild($amt);

      // Klick → Fokus togglen (Producer/Consumer später markieren)
      el.addEventListener('click', ()=>{
        const active = !el.classList.contains('is-focused');
        document.querySelectorAll('.res-card.is-focused')
          .forEach(x => x.classList.remove('is-focused'));
        if (active) el.classList.add('is-focused');
        emit('req:res:focus',   { resId:r.id, active });
        emit('cb:hud:res:focus',{ resId:r.id, active });
      });

      $grid.appendChild(el);
      cards.set(r.id, { el, $amt });
      if (!amounts.has(r.id)) amounts.set(r.id, 0);
    });

    // Sichtbar schalten
    $root.classList.remove('hidden');
    $root.hidden = false;

    log.ok('HUD gebaut:', cards.size, 'Ressourcen');
  }

  function setAmount(id, value){
    const v = Math.max(0, value|0);
    amounts.set(id, v);
    const c = cards.get(id);
    if (c) c.$amt.textContent = nf(v);
  }

  function addAmount(id, delta){
    const v = Math.max(0, (amounts.get(id) || 0) + (delta|0));
    setAmount(id, v);
  }

  function resetAmounts(scope, resId){
    if (scope === 'all' || !resId){
      amounts.forEach((_, id)=> setAmount(id, 0));
    } else {
      setAmount(resId, 0);
    }
  }

  // -------------------------------------------------------------------------
  // [03] Event-Wiring
  // -------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', buildHUD);
  window.addEventListener('cb:ui-ready', () => { if (!cards.size) buildHUD(); });

  // Änderungen durch Game/Core/Carrier/Produktionen
  window.addEventListener('cb:res:change', (ev)=>{
    const d  = ev?.detail || {};
    const id = d.res || d.id;
    if (!id) return;
    if (typeof d.amount === 'number') setAmount(id, d.amount);
    else if (typeof d.delta  === 'number') addAmount(id, d.delta);
  });

  window.addEventListener('cb:res:reset', (ev)=>{
    const d = ev?.detail || {};
    resetAmounts(d.scope || 'all', d.res);
  });

  window.addEventListener('cb:res:snapshot', (ev)=>{
    const map = ev?.detail?.amounts || {};
    Object.keys(map).forEach(id => setAmount(id, map[id]|0));
  });

  // -------------------------------------------------------------------------
  // [04] Init
  // -------------------------------------------------------------------------
  (function init(){
    log.inf('HUD Modul geladen (v23.0.0)');
    emit('cb:hud-ready', { ok:true });
    emit('req:res:snapshot'); // Core/Speicher kann mit cb:res:snapshot antworten
  })();
})();
