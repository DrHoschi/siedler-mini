/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v24.0.0 (2025-10-08)
 * Zweck    : Baumenü (Kategorien + Karten). Startet Platziermodus, verwaltet
 *            NICHT den Ghost. (Ghost/OK/X ist in ui/ui-place.js)
 *
 * Events (listen)
 *   - cb:registry:ready        → Baumenü aufbauen
 *   - cb:build:open/close      → Dock zeigen/verbergen
 *   - cb:place:done {exit?}    → optional: externes Beenden triggert Dock-UI
 *
 * Events (emit)
 *   - req:build:open / req:build:close
 *   - req:build:category { id }
 *   - req:place:start   { buildingId }
 *
 * Abhängigkeiten
 *   - core/registry.js  → Registry.list('buildings', {epoche})
 *   - data/buildings.json (iconsBase optional)
 *   - assets/icons/buildings/… (Gebäude-Icons)
 *   - assets/icons/build/…     (Kategorien-Icons)
 *   - assets/icons/resources/… (Kosten-Icons)
 *   - ui/css/ui-build.css      (Optik/Variablen)
 * ========================================================================== */
(function(){
  'use strict';

  // -------------------------------------------------------------------------
  // [00] DOM-Refs, Utils
  // -------------------------------------------------------------------------
  const $dock = document.getElementById('build-dock');
  const $btn  = document.getElementById('btn-build');

  if (!$dock){
    (console.warn)('[build] #build-dock fehlt – bitte in index.html prüfen');
    return;
  }

  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, { detail })); }
  const log = (...a)=> (window.CBLog?.ok || console.log)('[build]', ...a);

  function iconsBaseBuildings(){
    const base = (typeof Registry?.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    return base.replace(/\/?$/,'/');
  }
  const iconsBaseCategories = 'assets/icons/build/';

  // -------------------------------------------------------------------------
  // [01] Öffnen/Schließen des Docks
  // -------------------------------------------------------------------------
  function openDock(){
    $dock.classList.remove('hidden');
    document.body.classList.add('is-build-open');
    emit('cb:build:open');
  }
  function closeDock(){
    $dock.classList.add('hidden');
    document.body.classList.remove('is-build-open');
    emit('cb:build:close');
  }

  $btn?.addEventListener('click', ()=>{
    const isOpen = !$dock.classList.contains('hidden');
    if (isOpen) closeDock(); else openDock();
  });

  // -------------------------------------------------------------------------
  // [02] Render: Kopf, Kategorien, Grid
  // -------------------------------------------------------------------------
  let _cards = []; // Referenzen auf Karten (für Filter)

  function renderDock(){
    const list = (typeof Registry?.list === 'function')
      ? Registry.list('buildings', { epoche: 1 })  // Epoche-Filter (E1)
      : [];

    $dock.innerHTML = '';

    // Kopf mit Schließen-Button
    const head = document.createElement('div');
    head.className = 'build-head';
    head.innerHTML = `
      <strong>Baumenü – Epoche 1</strong>
      <div class="build-head-right">
        <span class="build-count">${list.length} Gebäude</span>
        <button class="build-close" title="Schließen" aria-label="Schließen">✕</button>
      </div>
    `;
    $dock.appendChild(head);
    head.querySelector('.build-close')?.addEventListener('click', closeDock);

    // Kategorien sammeln
    const cats = collectCategories(list);
    renderCategoryBar($dock, cats, (catId)=> filterByCategory(catId));

    // Grid rendern
    const grid = document.createElement('div');
    grid.className = 'build-grid';
    $dock.appendChild(grid);

    // Karten
    _cards = list.map(b=>{
      const card  = document.createElement('button');
      card.className = 'build-card';
      card.dataset.cat = (b.category || 'misc');
      card.title = b.name || b.id;

      // Titel
      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = b.name || b.id;

      // Illustration
      const illu = document.createElement('img');
      illu.className = 'card-illu';
      const fileName = (b.icon && typeof b.icon === 'string') ? b.icon : `${b.id}.png`;
      illu.src = iconsBaseBuildings() + fileName;
      illu.alt = title.textContent;

      // Kostenreihe
      const costs = document.createElement('div');
      costs.className = 'card-costs';
      (b.cost || []).forEach(c=>{
        const row = document.createElement('span');
        row.className = 'cost';
        row.innerHTML = `
          <img src="assets/icons/resources/${c.id}.png" alt="${c.id}">
          <b>×${c.qty}</b>
        `;
        costs.appendChild(row);
      });

      // Klick → Platziermodus starten (ui-place.js übernimmt)
      card.addEventListener('click', ()=>{
        emit('req:place:start', { buildingId: b.id });
        // Baumenü offen lassen (Serienbau). Nutzer kann es manuell schließen.
      });

      card.appendChild(title);
      card.appendChild(illu);
      card.appendChild(costs);
      grid.appendChild(card);

      return card;
    });

    // Startfilter: "all"
    filterByCategory('all');
    log('render ok →', _cards.length, 'Gebäude');
  }

  function collectCategories(buildings){
    // Versucht Kategorien aus buildings.json; fällt auf heuristische Labels zurück
    const map = new Map();
    map.set('all', { id:'all', name:'Alles',   icon:`${iconsBaseCategories}all.png`, count:0 });

    buildings.forEach(b=>{
      const id = b.category || 'misc';
      if (!map.has(id)){
        map.set(id, {
          id,
          name: labelForCategory(id),
          icon: `${iconsBaseCategories}${id}.png`,
          count: 0
        });
      }
      map.get(id).count++;
      map.get('all').count++;
    });

    return [...map.values()];
  }

  function labelForCategory(id){
    switch(id){
      case 'admin':     return 'Verwaltung';
      case 'resource':  return 'Rohstoffe';
      case 'food':      return 'Nahrung';
      case 'housing':   return 'Wohnen';
      case 'logistics': return 'Logistik';
      case 'military':  return 'Verteidigung';
      case 'decor':     return 'Deko';
      case 'roads':     return 'Wege';
      default:          return id;
    }
  }

  function renderCategoryBar(dock, cats, onChange){
    let bar = dock.querySelector('.build-cats');
    if(!bar){
      bar = document.createElement('div');
      bar.className = 'build-cats';
      dock.appendChild(bar);
    }
    bar.innerHTML = '';

    let active = 'all';
    cats.forEach(cat=>{
      const btn = document.createElement('button');
      btn.className = 'chip' + (cat.id===active ? ' chip--active' : '');
      btn.dataset.cat = cat.id;
      btn.innerHTML = `
        <img class="chip-icon" src="${cat.icon}" alt="">
        <span class="chip-label">${cat.name}</span>
        <span class="chip-count">${cat.count}</span>
      `;
      btn.addEventListener('click', ()=>{
        active = cat.id;
        bar.querySelectorAll('.chip').forEach(c=>c.classList.toggle('chip--active', c===btn));
        onChange(active);
        emit('req:build:category', { id: active });
      });
      bar.appendChild(btn);
    });
  }

  function filterByCategory(catId){
    _cards.forEach(card=>{
      const match = (catId==='all') || (card.dataset.cat === catId);
      card.style.display = match ? '' : 'none';
    });
  }

  // -------------------------------------------------------------------------
  // [03] Wiring
  // -------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', renderDock);
  window.addEventListener('cb:place:done', (ev)=>{
    // Wenn extern entschieden wird, den Baumodus zu verlassen:
    if (ev?.detail?.exit) {
      // hier könntest du optional das Dock schließen
      // closeDock();
    }
  });

  // Öffnen/Schließen über externe Events
  window.addEventListener('req:build:open', openDock);
  window.addEventListener('req:build:close', closeDock);

  // Dock NICHT automatisch öffnen (dein Button steuert das)
})();
