/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.16-final+costs-bridge-1
 * Modul    : Baumenü – Kategorien + Gebäude-Karten + Kostenanzeige
 * Hinweis  : KEIN HUD IN DIESER DATEI!
 *
 * Ziele
 * ------
 * - Baumenü-Panel (#build-dock) im bestehenden Layout (siehe ui-build.css)
 * - Kategorien-Leiste (Buttons) + Kartenraster
 * - Pro Gebäude-Karte:
 *      • Name oben links
 *      • Icon mittig
 *      • Kosten-Chips unten (Ressourcen-Icon + Menge)
 * - Robust an Registry & bestehende Bridges angebunden:
 *      • Unterstützt window.UIBuild (mount/setCategories/setItems/rerender)
 *      • Nutzt Registry.list('buildings'), falls keine externen Daten gesetzt wurden
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

  /* ------------------------------------------------------------------------
   * Logger / Kurzformen
   * --------------------------------------------------------------------- */
  const LOG = (...m)=> (window.CBLog?.log   || console.log )('[build]', ...m);
  const INF = (...m)=> (window.CBLog?.info  || console.info)('[build]', ...m);
  const WRN = (...m)=> (window.CBLog?.warn  || console.warn)('[build]', ...m);
  const ERR = (...m)=> (window.CBLog?.error || console.error)('[build]', ...m);

  const $dock = document.getElementById('build-dock');
  if (!$dock){
    ERR('DOM: #build-dock fehlt – Abbruch.');
    return;
  }

  const getBtn = () => document.getElementById('btn-build');

  /* ------------------------------------------------------------------------
   * State
   * --------------------------------------------------------------------- */
  /** Alle bekannten Gebäude-Items (aus Registry oder Bridge) */
  let BUILDINGS   = [];
  /** Kategorien-Liste {id, label, icon?} */
  let CATEGORIES  = [];
  /** aktuelle Kategorie */
  let ACTIVE_CAT  = 'all';
  /** Panel offen/zu */
  let IS_OPEN     = false;
  /** DOM-Struktur einmal aufgebaut? */
  let INIT_DONE   = false;
  /** Wurden Items/Cats von externer Bridge (UIBuild.setItems/setCategories) gesetzt? */
  let HAS_EXTERNAL_DATA = false;

  // DOM-Handles – werden nach Template-Aufbau gesetzt
  let $head, $title, $count, $btnClose;
  let $body, $cats, $grid, $empty;

  /* ------------------------------------------------------------------------
   * Helpers
   * --------------------------------------------------------------------- */
  const iconRes = id => `assets/icons/resources/${id}.png`;
  const iconBld = id => `assets/icons/buildings/${id}.png`;
  const emit    = (name, detail={}) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  /** Kategorie-Filter: erlaubt b.categories, b.category oder b.cat */
  function byCat(list, catId){
    if (catId === 'all') return list;
    return list.filter(b => {
      if (!b) return false;
      if (Array.isArray(b.categories) && b.categories.includes(catId)) return true;
      if (typeof b.category === 'string' && b.category === catId) return true;
      if (typeof b.cat === 'string' && b.cat === catId) return true;
      return false;
    });
  }

  /** Normalisiert Kosten zu [{id, amount}] – tolerant gegenüber Formaten */
  function normalizeCosts(b){
    if (!b) return [];
    const src = b.costs || b.cost || b.price;
    if (!src) return [];

    if (Array.isArray(src)){
      return src
        .filter(c => c && c.id && typeof c.amount === 'number' && c.amount > 0)
        .map(c => ({ id: String(c.id), amount: c.amount }));
    }
    if (typeof src === 'object'){
      return Object.entries(src)
        .filter(([id, amount]) => typeof amount === 'number' && amount > 0)
        .map(([id, amount]) => ({ id: String(id), amount }));
    }
    return [];
  }

  /** Kategorien aus BUILD_CATEGORIES oder aus Buildings ableiten */
  function deriveCategoriesFromData(){
    // 1) Bevorzugt: extern gepflegte BUILD_CATEGORIES
    if (Array.isArray(window.BUILD_CATEGORIES) && window.BUILD_CATEGORIES.length){
      return window.BUILD_CATEGORIES.slice();
    }

    // 2) Fallback: aus Buildings
    const map = new Map();
    map.set('all', { id:'all', label:'Alles' });

    BUILDINGS.forEach(b => {
      if (!b) return;
      const cats = Array.isArray(b.categories) && b.categories.length
        ? b.categories
        : (b.category ? [b.category] : []);

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

  /* ------------------------------------------------------------------------
   * DOM / Template
   * --------------------------------------------------------------------- */
  function buildDockDom(){
    if (INIT_DONE) return;

    const html = [
      '<div class="build-panel">',
      '  <div class="build-dock__head">',
      '    <div class="build-dock__title">',
      '      <span>Baumenü</span>',
      '      <span id="build-count">– Gebäude</span>',
      '    </div>',
      '    <button type="button" class="build-dock__close" id="build-close">×</button>',
      '  </div>',
      '  <div class="build-dock__body">',
      '    <div class="build-cats"  id="build-cats"></div>',
      '    <div class="build-grid"  id="build-grid"></div>',
      '    <div class="build-empty hidden" id="build-empty">',
      '      Keine Gebäude gefunden. Prüfe data/buildings.json oder Registry-Kategorien.',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    $dock.innerHTML = html;

    $head     = $dock.querySelector('.build-dock__head');
    $title    = $dock.querySelector('.build-dock__title');
    $count    = $dock.querySelector('#build-count');
    $btnClose = $dock.querySelector('#build-close');
    $body     = $dock.querySelector('.build-dock__body');
    $cats     = $dock.querySelector('#build-cats');
    $grid     = $dock.querySelector('#build-grid');
    $empty    = $dock.querySelector('#build-empty');

    if ($btnClose){
      $btnClose.addEventListener('click', closeDock);
    }

    const btn = getBtn();
    if (btn){
      btn.addEventListener('click', toggleDock);
    } else {
      WRN('#btn-build nicht gefunden – Dock nur programmatisch steuerbar.');
    }

    INIT_DONE = true;
  }

  /* ------------------------------------------------------------------------
   * Render-Funktionen
   * --------------------------------------------------------------------- */
  function renderCategories(){
    if (!$cats) return;
    $cats.innerHTML = '';

    if (!CATEGORIES.length){
      CATEGORIES = deriveCategoriesFromData();
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

  function onCardClick(building){
    INF('Gebäude gewählt:', building.id || building.name);
    emit('req:build:select', { building });
  }

  function renderGrid(){
    if (!$grid || !$empty) return;
    $grid.innerHTML = '';

    const list = byCat(BUILDINGS, ACTIVE_CAT);
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

    if ($count){
      $count.textContent = `${BUILDINGS.length} Gebäude`;
    }
  }

  /* ------------------------------------------------------------------------
   * Open / Close
   * --------------------------------------------------------------------- */
  function openDock(){
    if (IS_OPEN) return;
    IS_OPEN = true;
    $dock.hidden = false;
    emit('cb:build:open', { open:true });
  }

  function closeDock(){
    if (!IS_OPEN) return;
    IS_OPEN = false;
    $dock.hidden = true;
    emit('cb:build:close', { open:false });
  }

  function toggleDock(){
    IS_OPEN ? closeDock() : openDock();
  }

  /* ------------------------------------------------------------------------
   * Init über Registry (Fallback, falls keine externe Bridge liefert)
   * --------------------------------------------------------------------- */
  function initFromRegistry(tag){
    if (HAS_EXTERNAL_DATA){
      INF('InitFromRegistry übersprungen, externe Daten via UIBuild aktiv.', tag);
      return;
    }
    if (!window.Registry || typeof window.Registry.list !== 'function'){
      WRN('Registry nicht verfügbar – kein Fallback-Init möglich.', tag);
      return;
    }

    try{
      const items = window.Registry.list('buildings') || [];
      BUILDINGS = Array.isArray(items) ? items.slice() : [];
      CATEGORIES = deriveCategoriesFromData();
      INF(`Registry-Init: ${BUILDINGS.length} Gebäude, ${CATEGORIES.length} Kategorien (${tag||'init'})`);
      buildDockDom();
      renderCategories();
      renderGrid();
    } catch(err){
      ERR('Fehler bei initFromRegistry:', err);
    }
  }

  /* ------------------------------------------------------------------------
   * window.UIBuild – API für Bridges (core/ui-build.data-bridge.js, ui/ui-bridge.js)
   * --------------------------------------------------------------------- */
  const UIBuild = {
    /** Optional: Mount-Aufruf mit Container – wir nutzen immer #build-dock */
    mount(el){
      // Falls irgendwann ein anderer Container gewünscht ist, könnte man hier umhängen.
      buildDockDom();
      emit('cb:UIBuild:mounted', { el: $dock });
    },

    /** Kategorien von außen setzen (z. B. BUILD_CATEGORIES) */
    setCategories(cats){
      if (!Array.isArray(cats)) return;
      CATEGORIES = cats.slice();
      HAS_EXTERNAL_DATA = true;
      buildDockDom();
      renderCategories();
      renderGrid();
    },

    /** Items (Gebäude) von außen setzen */
    setItems(items){
      if (!Array.isArray(items)) return;
      BUILDINGS = items.slice();
      HAS_EXTERNAL_DATA = true;
      buildDockDom();
      renderCategories();
      renderGrid();
    },

    /** Manueller Neuaufbau (z. B. nach Filterwechsel anderswo) */
    rerender(){
      buildDockDom();
      renderCategories();
      renderGrid();
    },

    /** Panel steuern */
    open:   openDock,
    close:  closeDock,
    toggle: toggleDock
  };

  // global verfügbar machen
  try{
    Object.defineProperty(window, 'UIBuild', {
      value: UIBuild,
      writable: false,
      configurable: false
    });
  } catch(_){
    window.UIBuild = UIBuild;
  }

  // Signal an Bridges: UIBuild ist bereit
  emit('cb:UIBuild:ready', {});

  /* ------------------------------------------------------------------------
   * Event-Wiring
   * --------------------------------------------------------------------- */
  // Fallback-Init über Registry-Events (falls keine Bridge genutzt wird)
  window.addEventListener('cb:registry:ready', () => initFromRegistry('cb:registry:ready'), { once:true });
  window.addEventListener('cb:assets-ready',   () => initFromRegistry('cb:assets-ready'),   { once:true });

  // Sicherer Boot-Fallback (falls Registry schon fertig ist)
  setTimeout(() => {
    if (!BUILDINGS.length && window.Registry && typeof window.Registry.list === 'function'){
      initFromRegistry('boot-timeout');
    }
  }, 200);

  LOG('ui-build geladen (v25.11.16-final+costs-bridge-1)');
})(); 
