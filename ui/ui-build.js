/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v21.0.0 (2025-10-07)
 * Zweck    : Baumenü (Epoche 1) + Kategorien + Platzieren (Ghost ✔/✖, Zoom)
 *
 * Events (listen):
 *   - cb:ui-ready            → optional, spätere Hooks
 *   - cb:registry:ready      → Katalog laden & Dock rendern
 *   - cb:build:open/close    → Dock zeigen/verbergen (Body-State setzen)
 *   - cb:place:done          → externes Beenden (z. B. Reset)
 *   - cb:zoom:change         → Ghost neu skalieren (optional)
 *
 * Events (emit):
 *   - req:place:start   { buildingId }
 *   - req:place:confirm { tx, ty }         // Serienbau: bleibt an
 *   - req:place:cancel
 *
 * Leitplanken:
 *   - Größensteuerung & Optik → ui/css/ui-build.css (Variablen!)
 *   - Kategorien aus buildings.json (Feld "category"), fallback "misc"
 *   - Iconquelle: assets/icons/buildings/<id>.png oder b.icon
 *   - Ghost skaliert mit Game.tileSize * Zoom.scale (falls Zoom vorhanden)
 * ============================================================================ */

(function(){
  'use strict';

  // ---------------------------------------------------------------------------
  // [00] Shortcuts & Helpers
  // ---------------------------------------------------------------------------
  const $dock = document.getElementById('build-dock');
  const $btn  = document.getElementById('btn-build');
  const $ghostRoot = ensureGhostRoot();

  function $(sel, r=document){ return r.querySelector(sel); }
  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, { detail })); }
  function okLog (...a){ (window.CBLog?.ok || console.log)('[build]', ...a); }
  function wrnLog(...a){ (window.CBLog?.warn|| console.warn)('[build]', ...a); }

  function ensureGhostRoot(){
    let root = document.querySelector('.place-overlay');
    if (!root){
      root = document.createElement('div');
      root.className = 'place-overlay';
      document.body.appendChild(root);
    }
    root.innerHTML = '';
    return root;
  }
  function iconsBase(){
    const base = (typeof Registry?.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    return base.replace(/\/?$/,'/');
  }
  function getScale(){ return (window.Zoom && typeof Zoom.scale==='number') ? Zoom.scale : 1; }
  function tilePx(){
    const base = (window.Game && Game.tileSize) ? Game.tileSize : 32;
    return base * getScale();
  }

  // Body-States (damit HUD/Layer sauber bleiben)
  window.addEventListener('cb:build:open', ()=>{
    document.body.classList.add('is-build-open');
    $dock?.classList.remove('hidden');
  });
  window.addEventListener('cb:build:close', ()=>{
    document.body.classList.remove('is-build-open');
    $dock?.classList.add('hidden');
  });

  // Optionaler Button (wenn vorhanden)
  $btn?.addEventListener('click', ()=>{
    const open = !$dock || $dock.classList.contains('hidden');
    window.dispatchEvent(new CustomEvent(open? 'cb:build:open' : 'cb:build:close'));
  });

  // ---------------------------------------------------------------------------
  // [01] Katalog rendern (Epoche 1)
  // ---------------------------------------------------------------------------
  function renderDock(){
    if(!$dock){ wrnLog('kein #build-dock'); return; }

    // Daten holen
    const list = (typeof Registry?.list === 'function')
      ? Registry.list('buildings', { epoche:1 })
      : [];

    $dock.innerHTML = ''; // clean

    // Kopfzeile
    const head = document.createElement('div');
    head.className = 'build-head';
    head.innerHTML = `<strong>Baumenü (Epoche 1)</strong><span class="build-count"></span>`;
    $dock.appendChild(head);
    head.querySelector('.build-count').textContent = `${list.length} Gebäude`;

    // Kategorien-Bar
    const cats = collectCategories(list);
    renderCategoryBar($dock, cats, (catId)=> filterCardsByCategory($dock, catId));

    // Grid + Karten
    const grid = document.createElement('div');
    grid.className = 'build-grid';
    $dock.appendChild(grid);

    list.forEach(b=>{
      const card  = document.createElement('button');
      card.className = 'build-card';
      card.dataset.cat = (b.category || 'misc');

      // Titel
      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = b.name || b.id;

      // Illustration
      const illu = document.createElement('img');
      illu.className = 'card-illu';
      const fileName  = (b.icon && typeof b.icon === 'string') ? b.icon : `${b.id}.png`;
      illu.src = iconsBase() + fileName;
      illu.alt = b.name || b.id;

      // Kosten
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

      // Klick → Platzieren
      card.addEventListener('click', ()=> startPlacing(b));

      card.appendChild(title);
      card.appendChild(illu);
      card.appendChild(costs);
      grid.appendChild(card);
    });

    // initial "Alles"
    filterCardsByCategory($dock, 'all');
    okLog('render ok →', list.length, 'Gebäude');
  }

  function collectCategories(buildings){
    const map = new Map();
    map.set('all', {id:'all', name:'Alles', count:buildings.length});
    for (const b of buildings){
      const id = b.category || 'misc';
      const name = (
        id==='admin' ? 'Verwaltung' :
        id==='prod'  ? 'Rohstoffe'  :
        id==='food'  ? 'Nahrung'    :
        id==='home'  ? 'Wohnen'     : id
      );
      const e = map.get(id) || {id, name, count:0};
      e.count++; map.set(id, e);
    }
    return [...map.values()];
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
      btn.textContent = cat.name;
      btn.addEventListener('click', ()=>{
        active = cat.id;
        bar.querySelectorAll('.chip').forEach(c=>c.classList.toggle('chip--active', c===btn));
        onChange(active);
      });
      bar.appendChild(btn);
    });
  }
  function filterCardsByCategory(dock, catId){
    dock.querySelectorAll('.build-card').forEach(card=>{
      const match = catId==='all' || (card.dataset.cat===catId);
      card.style.display = match ? '' : 'none';
    });
  }

  // ---------------------------------------------------------------------------
  // [02] Platziermodus (Ghost ✔/✖, Zoom)
  // ---------------------------------------------------------------------------
  let placing = null; // { building, size:{w,h} }

  function startPlacing(building){
    placing = { building, size: building.size || {w:1, h:1} };
    $ghostRoot.innerHTML = '';

    const tpx = tilePx();
    const fileName = (building.icon && typeof building.icon==='string') ? building.icon : `${building.id}.png`;

    // Sprite
    const ghost = document.createElement('div');
    ghost.className = 'place-sprite';
    ghost.style.width  = (placing.size.w * tpx) + 'px';
    ghost.style.height = (placing.size.h * tpx) + 'px';
    ghost.style.backgroundImage = `url(${iconsBase()}${fileName})`;
    ghost.style.backgroundSize  = 'cover';
    $ghostRoot.appendChild(ghost);

    // ✔ OK
    const ok = document.createElement('button');
    ok.className = 'place-btn ok';
    ok.title = 'Bestätigen';
    ok.textContent = '✓';
    ghost.appendChild(ok);
    ok.addEventListener('click', onOk);

    // ✖ Cancel
    const cancel = document.createElement('button');
    cancel.className = 'place-btn cancel';
    cancel.title = 'Abbrechen';
    cancel.textContent = '✕';
    ghost.appendChild(cancel);
    cancel.addEventListener('click', cancelPlacing);

    // Wiring
    window.addEventListener('mousemove', onMouseMove, { passive:true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('cb:zoom:change', onZoomChange);

    emit('req:place:start', { buildingId: building.id });
    okLog('place:start', building.id);

    // Initialposition (0,0)
    onMouseMove({ clientX: 0, clientY: 0 });
  }

  function onKeyDown(e){
    if(e.key === 'Escape' || e.key === 'Backspace') cancelPlacing();
    if(e.key === 'Enter') onOk(e);
  }

  function onMouseMove(e){
    if(!placing) return;
    const tpx = tilePx();
    const tx = Math.floor(e.clientX / tpx);
    const ty = Math.floor(e.clientY / tpx);

    const ghost = $ghostRoot.querySelector('.place-sprite');
    ghost.style.left = (tx*tpx) + 'px';
    ghost.style.top  = (ty*tpx) + 'px';
  }

  function onZoomChange(){
    if(!placing) return;
    const tpx = tilePx();
    const ghost = $ghostRoot.querySelector('.place-sprite');
    const rect  = ghost.getBoundingClientRect();
    const tx = Math.round(rect.left / tpx);
    const ty = Math.round(rect.top  / tpx);
    ghost.style.width  = (placing.size.w * tpx) + 'px';
    ghost.style.height = (placing.size.h * tpx) + 'px';
    ghost.style.left   = (tx * tpx) + 'px';
    ghost.style.top    = (ty * tpx) + 'px';
  }

  function onOk(e){
    e?.stopPropagation?.();
    if(!placing) return;
    const tpx = tilePx();
    const ghost = $ghostRoot.querySelector('.place-sprite');
    const rect  = ghost.getBoundingClientRect();
    const tx = Math.round(rect.left / tpx);
    const ty = Math.round(rect.top  / tpx);

    // Serienbau: NICHT abbrechen – bleibt aktiv bis ✖
    emit('req:place:confirm', { tx, ty });
    okLog('place:confirm', {tx, ty});
  }

  function cancelPlacing(){
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('cb:zoom:change', onZoomChange);
    $ghostRoot.innerHTML = '';
    placing = null;
    emit('req:place:cancel');
    okLog('place:cancel');
  }

  window.addEventListener('cb:place:done', (ev)=>{ if (ev?.detail?.exit) cancelPlacing(); });

  // ---------------------------------------------------------------------------
  // [03] Boot: auf Registry warten & NICHT auto-open
  // ---------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', renderDock);

  // nichts automatisch öffnen – Button/Ereignis steuert es
})();
