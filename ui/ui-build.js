/* ============================================================================
 * (1) Datei    : ui/ui-build.js
 *     Projekt  : Neue Siedler
 *     Version  : v24.3.2 (2025-10-08)
 *     Zweck    : Baumenü (Kategorien + Karten mit Holzrahmen + Kosten)
 * ----------------------------------------------------------------------------
 * (2) Events (listen)
 *     • cb:registry:ready
 *     • req:build:open / req:build:close
 * (3) Events (emit)
 *     • cb:build:open / cb:build:close
 *     • req:build:category { id }
 *     • req:place:start   { buildingId }
 * (4) Abhängigkeiten
 *     • core/registry.js, data/buildings.json (optional iconsBase)
 *     • assets/icons/buildings/*  (Gebäude)
 *     • assets/icons/build/*      (Kategorien)
 *     • assets/icons/resources/*  (Kosten)
 *     • ui/css/ui-build.css v24.3.2
 * (5) Changelog v24.3.2
 *     • NEU: <img class="card-panel" src="assets/ui/panel.png"> je Karte
 *       (sichtbarer Holzrahmen in allen Browsern)
 * ========================================================================== */
(function(){
  'use strict';

  // ---------------------------------------------------------------------------
  // (6) DOM & Utils
  // ---------------------------------------------------------------------------
  const $dock = document.getElementById('build-dock');
  const $btn  = document.getElementById('btn-build');
  if (!$dock){ (console.warn)('[build] #build-dock fehlt'); return; }

  const log  = (...a)=> (window.CBLog?.ok || console.log)('[build]', ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn)('[build]', ...a);

  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, { detail })); }

  function iconsBaseBuildings(){
    const base = (typeof Registry?.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    return base.replace(/\/?$/,'/'); // trailing slash
  }
  const iconsBaseCategories = 'assets/icons/build/';
  const panelSrc = 'assets/ui/panel.png';

  // ---------------------------------------------------------------------------
  // (7) Dock öffnen/schließen
  // ---------------------------------------------------------------------------
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

  // Karten-Referenzen (für Filtern)
  let _cards = [];

  // ---------------------------------------------------------------------------
  // (8) Render Dock
  // ---------------------------------------------------------------------------
  function renderDock(){
    const list = (typeof Registry?.list === 'function')
      ? Registry.list('buildings', { epoche: 1 })
      : [];

    $dock.innerHTML = '';

    // Kopf
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

    // Kategorien
    const cats = collectCategories(list);
    renderCategoryBar($dock, cats, (catId)=> filterByCategory(catId));

    // Grid
    const grid = document.createElement('div');
    grid.className = 'build-grid';
    $dock.appendChild(grid);

    // Karten
    _cards = list.map(b=>{
      const card  = document.createElement('button');
      card.className = 'build-card';
      card.dataset.cat = (b.category || 'misc');
      card.title = b.name || b.id;

      // (8.1) Panel-IMG – unterste Ebene (sichtbarer Holzrahmen)
      const panel = document.createElement('img');
      panel.className = 'card-panel';
      panel.src = panelSrc;
      panel.alt = '';
      panel.decoding = 'async';
      card.appendChild(panel);

      // (8.2) Titel
      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = b.name || b.id;

      // (8.3) Body + Illustration
      const body = document.createElement('div');
      body.className = 'card-body';

      const illu = document.createElement('img');
      illu.className = 'card-illu';
      const fileName = (b.icon && typeof b.icon === 'string') ? b.icon : `${b.id}.png`;
      illu.src = iconsBaseBuildings() + fileName;
      illu.alt = title.textContent;
      illu.decoding = 'async';
      body.appendChild(illu);

      // (8.4) Kosten
      const costs = document.createElement('div');
      costs.className = 'card-costs';

      const costArr = Array.isArray(b.cost)
        ? b.cost
        : (b.cost && typeof b.cost==='object'
            ? Object.keys(b.cost).map(id=>({ id, qty:b.cost[id] })) : []);

      costArr.forEach(c=>{
        const row = document.createElement('span');
        row.className = 'cost';
        row.innerHTML = `
          <img src="assets/icons/resources/${c.id}.png" alt="${c.id}">
          <b>×${c.qty}</b>
        `;
        costs.appendChild(row);
      });

      // (8.5) Click → Platziermodus
      card.addEventListener('click', ()=>{
        emit('req:place:start', { buildingId: b.id });
      });

      // (8.6) Zusammenbauen (Reihenfolge wichtig wegen Layering)
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(costs);
      grid.appendChild(card);

      return card;
    });

    filterByCategory('all');
    log('render ok →', _cards.length, 'Gebäude');
  }

  // ---------------------------------------------------------------------------
  // (9) Kategorien ermitteln & rendern
  // ---------------------------------------------------------------------------
  function collectCategories(buildings){
    const map = new Map();
    map.set('all', { id:'all', name:'Alles', icon:`${iconsBaseCategories}all.png`, count:0 });
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

      // Icon-Fallback (keine blauen "?")
      const img = btn.querySelector('.chip-icon');
      img.addEventListener('error', ()=>{ img.style.display='none'; });

      btn.addEventListener('click', ()=>{
        active = cat.id;
        bar.querySelectorAll('.chip').forEach(c=>c.classList.toggle('chip--active', c===btn));
        onChange(active);
        emit('req:build:category', { id: active });
      });
      bar.appendChild(btn);
    });
  }

  // ---------------------------------------------------------------------------
  // (10) Filtern
  // ---------------------------------------------------------------------------
  function filterByCategory(catId){
    _cards.forEach(card=>{
      const match = (catId==='all') || (card.dataset.cat === catId);
      card.style.display = match ? '' : 'none';
    });
  }

  // ---------------------------------------------------------------------------
  // (11) Events
  // ---------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', renderDock);
  window.addEventListener('req:build:open', openDock);
  window.addEventListener('req:build:close', closeDock);
})();
