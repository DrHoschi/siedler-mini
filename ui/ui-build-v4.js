/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.16-final+costs-simple1
 * Modul    : Baumenü – Kategorien + Gebäude-Karten + Kostenanzeige
 * Hinweis  : KEIN HUD IN DIESER DATEI!
 *
 * Funktionen:
 *  - Stellt das Baumenü-Dock (#build-dock) bereit
 *  - Liest Gebäudeliste aus Registry (cb:registry:ready / window.Registry)
 *  - Erzeugt Kategorien-Leiste (Buttons)
 *  - Rendert Karten mit:
 *      • Name oben links
 *      • Gebäude-Icon mittig
 *      • Kosten-Chips unten (Ressourcen-Icon + Zahl)
 *  - Öffnen/Schließen über #btn-build und Close-Button
 * ========================================================================== */

(function EnsureDock(){
  const ok  = (m)=> (window.CBLog?.ok || console.log)('[build]', m);
  let el = document.getElementById('build-dock');
  if (!el){
    el = document.createElement('div');
    el.id = 'build-dock';
    el.hidden = true;
    el.style.overflow = 'auto';
    document.body.appendChild(el);
    ok('Failsafe: #build-dock erzeugt.');
  }
})();

(function(){
  'use strict';

  /* ------------------------------- Logger --------------------------------- */
  const LOG = (...m)=> (window.CBLog?.log   || console.log )('[build]', ...m);
  const INF = (...m)=> (window.CBLog?.info  || console.info)('[build]', ...m);
  const WRN = (...m)=> (window.CBLog?.warn  || console.warn)('[build]', ...m);
  const ERR = (...m)=> (window.CBLog?.error || console.error)('[build]', ...m);

  /* ------------------------------- DOM-Refs ------------------------------- */
  const $dock = document.getElementById('build-dock');
  if (!$dock){
    ERR('DOM: #build-dock fehlt – Abbruch.');
    return;
  }
  const getBtnBuild = () => document.getElementById('btn-build');

  /* ------------------------------ State ----------------------------------- */
  let BUILDINGS   = [];
  let CATEGORIES  = [];
  let ACTIVE_CAT  = 'all';
  let IS_OPEN     = false;
  let INIT_DONE   = false;

  // DOM-Handles nach Template-Bau:
  let $head, $titleBox, $countLabel, $btnClose;
  let $body, $cats, $grid, $empty;

  /* ------------------------------ Helper ---------------------------------- */
  const iconRes = id => `assets/icons/resources/${id}.png`;
  const iconBld = id => `assets/icons/buildings/${id}.png`;
  const emit    = (name, detail={}) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  /** Kategorie-Filter: nutzt b.categories / b.category / b.cat */
  function filterByCategory(list, catId){
    if (catId === 'all') return list;
    return list.filter(b => {
      if (!b) return false;
      if (Array.isArray(b.categories) && b.categories.includes(catId)) return true;
      if (typeof b.category === 'string' && b.category === catId) return true;
      if (typeof b.cat === 'string' && b.cat === catId) return true;
      return false;
    });
  }

  /** Kosten zu [{id, amount}] normalisieren (tolerant) */
  function normalizeCosts(b){
    if (!b) return [];
    const src = b.costs || b.cost || b.price;
    if (!src) return [];

    // Array-Variante: [{id, amount}, …]
    if (Array.isArray(src)){
      return src
        .filter(c => c && c.id && typeof c.amount === 'number' && c.amount > 0)
        .map(c => ({ id: String(c.id), amount: c.amount }));
    }

    // Objekt-Variante: { wood: 3, stone: 1 }
    if (typeof src === 'object'){
      return Object.entries(src)
        .filter(([id, amount]) => typeof amount === 'number' && amount > 0)
        .map(([id, amount]) => ({ id: String(id), amount }));
    }

    return [];
  }

  /** Kategorien erzeugen: "all" + aus buildings abgeleitet */
  function deriveCategories(buildings){
    const map = new Map();
    map.set('all', { id: 'all', label: 'Alles' });

    buildings.forEach(b => {
      if (!b) return;
      let cats = [];
      if (Array.isArray(b.categories) && b.categories.length){
        cats = b.categories;
      } else if (typeof b.category === 'string'){
        cats = [b.category];
      } else if (typeof b.cat === 'string'){
        cats = [b.cat];
      }

      cats.forEach(id => {
        if (!id || typeof id !== 'string') return;
        if (!map.has(id)){
          const label = id.charAt(0).toUpperCase() + id.slice(1);
          map.set(id, { id, label });
        }
      });
    });

    return Array.from(map.values());
  }

  /* --------------------------- DOM / Template ----------------------------- */
  function buildDockDom(){
    if (INIT_DONE) return;

    const html = `
      <div class="build-panel">
        <div class="build-dock__head">
          <div class="build-dock__title">
            <span>Baumenü</span>
            <span id="build-count">– Gebäude</span>
          </div>
          <button type="button" class="build-dock__close" id="build-close">×</button>
        </div>
        <div class="build-dock__body">
          <div class="build-cats"  id="build-cats"></div>
          <div class="build-grid"  id="build-grid"></div>
          <div class="build-empty hidden" id="build-empty">
            Keine Gebäude gefunden. Prüfe data/buildings.json / Registry.
          </div>
        </div>
      </div>
    `.trim();

    $dock.innerHTML = html;

    $head       = $dock.querySelector('.build-dock__head');
    $titleBox   = $dock.querySelector('.build-dock__title');
    $countLabel = $dock.querySelector('#build-count');
    $btnClose   = $dock.querySelector('#build-close');
    $body       = $dock.querySelector('.build-dock__body');
    $cats       = $dock.querySelector('#build-cats');
    $grid       = $dock.querySelector('#build-grid');
    $empty      = $dock.querySelector('#build-empty');

    if ($btnClose){
      $btnClose.addEventListener('click', closeDock);
    }

    const btnBuild = getBtnBuild();
    if (btnBuild){
      btnBuild.addEventListener('click', toggleDock);
    } else {
      WRN('#btn-build nicht gefunden – Baumenü nur programmatisch steuerbar.');
    }

    INIT_DONE = true;
  }

  /* ------------------------- Render Kategorien ---------------------------- */
  function renderCategories(){
    if (!$cats) return;
    $cats.innerHTML = '';

    if (!CATEGORIES.length){
      CATEGORIES = deriveCategories(BUILDINGS);
    }

    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = cat.label || cat.id;
      btn.dataset.cat = cat.id;
      if (cat.id === ACTIVE_CAT) btn.classList.add('is-active');

      btn.addEventListener('click', () => {
        ACTIVE_CAT = cat.id;
        renderCategories();
        renderGrid();
      });

      $cats.appendChild(btn);
    });
  }

  /* ------------------------ Render Kosten-Chips --------------------------- */
  function buildCostChips(building){
    const wrap = document.createElement('div');
    wrap.className = 'build-costs';

    const list = normalizeCosts(building);
    if (!list.length) return wrap;

    list.forEach(c => {
      const chip = document.createElement('div');
      chip.className = 'build-cost';

      const icon = document.createElement('img');
      icon.className = 'build-cost__icon';
      icon.src = iconRes(c.id);
      icon.alt = c.id;

      const txt = document.createElement('span');
      txt.textContent = String(c.amount);

      chip.appendChild(icon);
      chip.appendChild(txt);
      wrap.appendChild(chip);
    });

    return wrap;
  }

  /* ------------------------ Render Karten-Grid ---------------------------- */
  function onCardClick(building){
    INF('Gebäude gewählt:', building.id || building.name);
    emit('req:build:select', { building });
  }

  function renderGrid(){
    if (!$grid || !$empty) return;
    $grid.innerHTML = '';

    const list = filterByCategory(BUILDINGS, ACTIVE_CAT);
    if (!list.length){
      $empty.classList.remove('hidden');
    } else {
      $empty.classList.add('hidden');
    }

    list.forEach(b => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'build-card';
      if (b.id) card.dataset.id = b.id;

      const titleEl = document.createElement('div');
      titleEl.className = 'build-card__title';
      titleEl.textContent = b.name || b.title || b.id || 'Unbenannt';

      const img = document.createElement('img');
      img.className = 'build-card__img';
      img.alt = b.name || b.id || '';
      img.src = b.icon || iconBld(b.id || 'unknown');

      const costsEl = buildCostChips(b);

      card.appendChild(titleEl);
      card.appendChild(img);
      card.appendChild(costsEl);

      card.addEventListener('click', () => onCardClick(b));
      $grid.appendChild(card);
    });

    if ($countLabel){
      $countLabel.textContent = `${BUILDINGS.length} Gebäude`;
    }
  }

  /* -------------------------- Open / Close -------------------------------- */
  function openDock(){
    if (IS_OPEN) return;
    IS_OPEN = true;
    $dock.hidden = false;
    emit('cb:build:open', { open: true });
  }

  function closeDock(){
    if (!IS_OPEN) return;
    IS_OPEN = false;
    $dock.hidden = true;
    emit('cb:build:close', { open: false });
  }

  function toggleDock(){
    IS_OPEN ? closeDock() : openDock();
  }

  /* ------------------------- Init aus Registry ---------------------------- */
  function readBuildingsFromRegistry(){
    // Verschiedene mögliche Stellen abklappern
    if (window.Registry && typeof window.Registry.list === 'function'){
      try{
        const list = window.Registry.list('buildings');
        if (Array.isArray(list) && list.length){
          return list;
        }
      } catch(e){
        WRN('Registry.list("buildings") Fehler:', e);
      }
    }

    if (window.Registry && Array.isArray(window.Registry.buildings)){
      return window.Registry.buildings;
    }
    if (Array.isArray(window.BUILD_BUILDINGS)){
      return window.BUILD_BUILDINGS;
    }

    return [];
  }

  function initFromRegistry(tag){
    try{
      BUILDINGS = readBuildingsFromRegistry();
      if (!Array.isArray(BUILDINGS)) BUILDINGS = [];
      INF(`InitFromRegistry (${tag}): ${BUILDINGS.length} Gebäude.`);
      buildDockDom();
      CATEGORIES = deriveCategories(BUILDINGS);
      renderCategories();
      renderGrid();
    } catch(err){
      ERR('initFromRegistry Fehler:', err);
    }
  }

  /* --------------------------- Event-Wiring ------------------------------- */
  // Registry-Event vom Core
  window.addEventListener('cb:registry:ready', (ev) => {
    // Wenn Detail bereits eine Buildings-Liste mitbringt, bevorzugen:
    const detail = ev.detail || {};
    if (Array.isArray(detail.buildings)){
      BUILDINGS = detail.buildings.slice();
      INF(`cb:registry:ready: ${BUILDINGS.length} Gebäude aus Detail.`);
      buildDockDom();
      CATEGORIES = deriveCategories(BUILDINGS);
      renderCategories();
      renderGrid();
    } else {
      initFromRegistry('cb:registry:ready');
    }
  }, { once:true });

  // Fallback, falls Registry schon vorher da ist
  setTimeout(() => {
    if (!BUILDINGS.length){
      initFromRegistry('timeout-fallback');
    }
  }, 200);

  LOG('ui-build geladen (v25.11.16-final+costs-simple1).');
})();
