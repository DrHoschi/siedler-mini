/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.16-final+costs-json1
 * Modul    : Baumenü – Kategorien + Gebäude-Karten + Kostenanzeige
 * Hinweis  : KEIN HUD IN DIESER DATEI!
 *
 * Funktionen:
 *  - Stellt das Baumenü-Dock (#build-dock) bereit
 *  - Lädt Gebäudeliste vorzugsweise aus Registry, sonst aus data/buildings.json
 *  - Erzeugt Kategorien-Leiste (Buttons)
 *  - Rendert Karten mit:
 *      • Name oben links
 *      • Gebäude-Icon mittig
 *      • Kosten-Chips unten (Icons + Zahl) aus deiner buildings.json (cost: [{id,qty}])
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

  // Icons-Basis (kann durch buildings.json.iconsBase überschrieben werden)
  let ICONS_BASE_BUILDINGS = 'assets/icons/buildings/';

  // DOM-Handles nach Template-Bau:
  let $head, $titleBox, $countLabel, $btnClose;
  let $body, $cats, $grid, $empty;

  /* ------------------------------ Helper ---------------------------------- */
  const iconRes = id => `assets/icons/resources/${id}.png`;
  const iconBld = id => (ICONS_BASE_BUILDINGS || 'assets/icons/buildings/') + (id || 'unknown') + '.png';
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

  /** Kosten zu [{id, amount}] normalisieren (tolerant)
   *  Deine buildings.json benutzt:
   *    "cost": [ { "id": "wood", "qty": 2 }, … ]
   */
  function normalizeCosts(b){
    if (!b) return [];
    const src = b.costs || b.cost || b.price;
    if (!src) return [];

    // Array-Variante: [{id, qty} oder {id, amount}]
    if (Array.isArray(src)){
      return src
        .filter(c =>
          c && c.id &&
          (typeof c.amount === 'number' || typeof c.qty === 'number')
        )
        .map(c => ({
          id: String(c.id),
          amount: (typeof c.amount === 'number') ? c.amount : c.qty
        }));
    }

    // Objekt-Variante: { wood: 3, stone: 1 }
    if (typeof src === 'object'){
      return Object.entries(src)
        .filter(([id, amount]) => typeof amount === 'number' && amount > 0)
        .map(([id, amount]) => ({ id: String(id), amount }));
    }

    return [];
  }

  /** Kategorien erzeugen, falls keine expliziten Kategorien vorliegen */
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

  /** JSON-Struktur aus data/buildings.json in lokale State-Variablen übernehmen */
  function applyBuildingsJson(json){
    if (!json || typeof json !== 'object') return;

    if (json.iconsBase && typeof json.iconsBase === 'string'){
      ICONS_BASE_BUILDINGS = json.iconsBase;
    }

    if (Array.isArray(json.buildings)){
      // enabled=false rausfiltern
      BUILDINGS = json.buildings.filter(b => b && b.enabled !== false);
    } else {
      BUILDINGS = [];
    }

    if (Array.isArray(json.categories) && json.categories.length){
      CATEGORIES = json.categories.map(c => ({
        id: c.id,
        label: c.label || c.id
      }));
      // sicherstellen, dass "all" existiert
      if (!CATEGORIES.some(c => c.id === 'all')){
        CATEGORIES.unshift({ id: 'all', label: 'Alles' });
      }
    } else {
      CATEGORIES = deriveCategories(BUILDINGS);
    }

    INF('applyBuildingsJson:', BUILDINGS.length, 'Gebäude,', CATEGORIES.length, 'Kategorien.');
  }

  /** buildings.json direkt laden (Fallback, wenn Registry nichts liefert) */
  function loadFromJson(tag){
    INF('loadFromJson gestartet:', tag);
    // Einfache fetch-Variante, ohne async/await
    fetch('data/buildings.json')
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(json => {
        INF('buildings.json geladen:', json && json.buildings ? json.buildings.length : 0, 'Einträge.');
        applyBuildingsJson(json);
        buildDockDom();
        renderCategories();
        renderGrid();
      })
      .catch(err => {
        ERR('Fehler bei loadFromJson(', tag, '):', err);
      });
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
      const list = readBuildingsFromRegistry();
      if (Array.isArray(list) && list.length){
        BUILDINGS = list;
        INF(`InitFromRegistry (${tag}): ${BUILDINGS.length} Gebäude.`);
        buildDockDom();
        // Kategorien nicht überschreiben, falls schon aus JSON gesetzt
        if (!CATEGORIES.length){
          CATEGORIES = deriveCategories(BUILDINGS);
        }
        renderCategories();
        renderGrid();
      } else {
        // Wenn Registry nichts liefert: JSON-Fallback
        WRN('Registry liefert keine Gebäude – Fallback auf buildings.json.');
        loadFromJson('registry-fallback:' + tag);
      }
    } catch(err){
      ERR('initFromRegistry Fehler:', err);
      loadFromJson('registry-error:' + tag);
    }
  }

  /* --------------------------- Event-Wiring ------------------------------- */
  // Registry-Event vom Core
  window.addEventListener('cb:registry:ready', (ev) => {
    const detail = ev.detail || {};
    if (Array.isArray(detail.buildings) && detail.buildings.length){
      BUILDINGS = detail.buildings.slice();
      INF(`cb:registry:ready: ${BUILDINGS.length} Gebäude aus Detail.`);
      buildDockDom();
      if (!CATEGORIES.length){
        CATEGORIES = deriveCategories(BUILDINGS);
      }
      renderCategories();
      renderGrid();
    } else {
      initFromRegistry('cb:registry:ready');
    }
  }, { once:true });

  // Fallback, falls Registry schon vorher da ist ODER gar nicht existiert
  setTimeout(() => {
    if (!BUILDINGS.length){
      // Erst Registry, dann ggf. JSON
      if (window.Registry){
        initFromRegistry('timeout-fallback');
      } else {
        loadFromJson('timeout-no-registry');
      }
    }
  }, 200);

  LOG('ui-build geladen (v25.11.16-final+costs-json1).');
})();
