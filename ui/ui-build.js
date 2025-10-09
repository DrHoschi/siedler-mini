/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v24.3.0 (2025-10-08)
 * Zweck    : Baumenü (Kategorien + Karten mit Holzrahmen + Kosten).
 *            Startet den Platziermodus für das ausgewählte Gebäude.
 *
 * Events (listen)
 *   - cb:registry:ready               → Baumenü aufbauen, sobald Registry fertig
 *   - req:build:open / req:build:close→ Dock zeigen/verbergen
 *
 * Events (emit)
 *   - cb:build:open / cb:build:close  → UI-State für andere Module (optional)
 *   - req:build:category { id }       → Nutzer hat Kategorie gewählt
 *   - req:place:start   { buildingId }→ Platziermodus für Gebäude starten
 *
 * Assets/Abhängigkeiten
 *   - core/registry.js  → Registry.list('buildings', {epoche}) / get('buildings', id)
 *   - data/buildings.json (optional: iconsBase)
 *   - assets/icons/buildings/… (Gebäude-Icons)
 *   - assets/icons/build/…     (Kategorien-Icons)
 *   - assets/icons/resources/… (Kosten-Icons)
 *   - ui/css/ui-build.css      (v24.3.0 oder neuer)
 *
 * Changelog v24.3.0
 *   - Content-Box innerhalb der Karte (.card-body) → stabile Illustration
 *   - object-fit / max-width / max-height für Bild → keine Über-/Unterläufe mehr
 *   - Kategorien-Icon-Fallback (onerror → ausblenden) → keine blauen "?"
 *   - Panel-Hintergrund wird vom CSS doppelt abgesichert (hart + variable)
 * ========================================================================== */
(function(){
  'use strict';

  // ---------------------------------------------------------------------------
  // DOM-Grundlagen
  // ---------------------------------------------------------------------------
  const $dock = document.getElementById('build-dock');
  const $btn  = document.getElementById('btn-build');
  if (!$dock){ (console.warn)('[build] #build-dock fehlt'); return; }

  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, { detail })); }
  const log = (...a)=> (window.CBLog?.ok || console.log)('[build]', ...a);

  // Pfad-Basis für Gebäude-Icons (Registry kann einen Basis-Pfad vorgeben)
  function iconsBaseBuildings(){
    const base = (typeof Registry?.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    return base.replace(/\/?$/,'/'); // trailing slash
  }
  const iconsBaseCategories = 'assets/icons/build/';

  // ---------------------------------------------------------------------------
  // Öffnen / Schließen des Docks
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
  // Render: Dock (Kopf → Kategorien → Grid mit Karten)
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

    // Kategorien-Leiste
    const cats = collectCategories(list);
    renderCategoryBar($dock, cats, (catId)=> filterByCategory(catId));

    // Grid
    const grid = document.createElement('div');
    grid.className = 'build-grid';
    $dock.appendChild(grid);

    // Karten aufbauen
    _cards = list.map(b=>{
      const card  = document.createElement('button');
      card.className = 'build-card';
      card.dataset.cat = (b.category || 'misc');
      card.title = b.name || b.id;

      // Titel
      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = b.name || b.id;

      // Inhalt (Illustration) → Content-Box verhindert Überschneidungen
      const body = document.createElement('div');
      body.className = 'card-body';

      const illu = document.createElement('img');
      illu.className = 'card-illu';
      const fileName = (b.icon && typeof b.icon === 'string') ? b.icon : `${b.id}.png`;
      illu.src = iconsBaseBuildings() + fileName;
      illu.alt = title.textContent;

      // Kosten
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

      // Click → Platziermodus
      card.addEventListener('click', ()=>{
        emit('req:place:start', { buildingId: b.id });
      });

      // Zusammensetzen
      body.appendChild(illu);
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(costs);
      grid.appendChild(card);

      return card;
    });

    // Standard: alle sichtbar
    filterByCategory('all');

    log('render ok →', _cards.length, 'Gebäude');
  }

  // ---------------------------------------------------------------------------
  // Kategorien ermitteln
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

  // ---------------------------------------------------------------------------
  // Kategorien-Leiste rendern (mit Icon-Fallback)
  // ---------------------------------------------------------------------------
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

      // Icon-Fallback → falls Datei fehlt, Grafik ausblenden (keine "?"-Kästchen)
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
  // Filtern nach Kategorie
  // ---------------------------------------------------------------------------
  function filterByCategory(catId){
    _cards.forEach(card=>{
      const match = (catId==='all') || (card.dataset.cat === catId);
      card.style.display = match ? '' : 'none';
    });
  }

  // ---------------------------------------------------------------------------
  // Event-Wiring
  // ---------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', renderDock);
  window.addEventListener('req:build:open', openDock);
  window.addEventListener('req:build:close', closeDock);
})();
