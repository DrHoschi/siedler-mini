/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.16-final+costs-1
 * Modul    : Baumenü – Kategorien + Gebäude-Karten + Kostenanzeige
 * Hinweis  : KEIN HUD IN DIESER DATEI!
 *
 * Aufgaben:
 *  - Stellt das Baumenü als Dock bereit (#build-dock)
 *  - Holt Gebäudeliste aus der Registry (cb:registry:ready)
 *  - Erzeugt Kategorien-Buttons (Alle / Holz / Stein / …)
 *  - Rendert Karten-Gitter mit:
 *      • Name oben links
 *      • Gebäude-Icon mittig
 *      • Kostenchips unten (Icon + Menge)
 *  - Öffnen/Schließen über #btn-build und Close-Button im Dock
 *
 * Events (lesen/senden):
 *  - liest:  cb:registry:ready { buildings, … }
 *  - sendet: cb:build:open / cb:build:close
 *            req:build:select { building }
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * [Failsafe] Dock-Container sicherstellen
 * ------------------------------------------------------------------------ */
(function EnsureDock(){
  const ok  = (m)=> (window.CBLog?.ok   || console.log)('[build]', m);
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

/* ---------------------------------------------------------------------------
 * Hauptmodul
 * ------------------------------------------------------------------------ */
(function(){
  'use strict';

  /* ------------------------------- Logger --------------------------------- */
  const LOG = (...m)=> (window.CBLog?.log   || console.log )('[build]',...m);
  const INF = (...m)=> (window.CBLog?.info  || console.info)('[build]',...m);
  const WRN = (...m)=> (window.CBLog?.warn  || console.warn)('[build]',...m);
  const ERR = (...m)=> (window.CBLog?.error || console.error)('[build]',...m);

  /* --------------------------- Grund-Referenzen --------------------------- */
  const $dock = document.getElementById('build-dock');
  if (!$dock){
    ERR('DOM: #build-dock fehlt – Abbruch.');
    return;
  }

  const getBtn = () => document.getElementById('btn-build');

  /* ------------------------------ State ----------------------------------- */
  /** Gesamte Gebäudeliste aus Registry */
  let BUILDINGS   = [];
  /** Kategorie-Infos: [{id, label}] */
  let CATEGORIES  = [];
  /** aktuell gefilterte Kategorie */
  let ACTIVE_CAT  = 'all';
  /** UI offen/zu */
  let IS_OPEN     = false;
  /** Initialisierung (DOM + Events) erledigt? */
  let INIT_DONE   = false;

  /* DOM-Handles (werden nach Template-Bau gesetzt) */
  let $head, $title, $count, $btnClose;
  let $body, $cats, $grid, $empty;

  /* ------------------------------ Helper ---------------------------------- */

  /** Pfad für Ressourcen-Icons */
  const iconRes = id => `assets/icons/resources/${id}.png`;
  /** Pfad für Gebäude-Icons */
  const iconBld = id => `assets/icons/buildings/${id}.png`;
  /** Event-Helfer */
  const emit = (name, detail={}) =>
    window.dispatchEvent(new CustomEvent(name,{ detail }));

  /** Filtert Gebäudeliste nach Kategorie */
  const byCat = (list, cat) =>
    cat === 'all'
      ? list
      : list.filter(b => Array.isArray(b.categories) && b.categories.includes(cat));

  /** Normalisiert Kosten zu [{id, amount}] – tolerant gegenüber Formaten */
  function normalizeCosts(b){
    if (!b) return [];

    const src = b.costs || b.cost || b.price;
    if (!src) return [];

    // Variante: Array [{id, amount}, …]
    if (Array.isArray(src)){
      return src
        .filter(c => c && c.id && typeof c.amount === 'number' && c.amount > 0)
        .map(c => ({ id: String(c.id), amount: c.amount }));
    }

    // Variante: Plain-Object { wood: 3, stone: 1 }
    if (typeof src === 'object'){
      return Object.entries(src)
        .filter(([id, amount]) => typeof amount === 'number' && amount > 0)
        .map(([id, amount]) => ({ id: String(id), amount }));
    }

    return [];
  }

  /** Erzeugt Kategorien-Liste aus Gebäuden */
  function deriveCategories(buildings){
    const set = new Map();
    // "all" immer vorhanden
    set.set('all', 'Alle');

    buildings.forEach(b => {
      const cats = Array.isArray(b.categories) && b.categories.length
        ? b.categories
        : ['misc'];

      cats.forEach(id => {
        if (!set.has(id)){
          // Name aus id ableiten, später könntest du übersetzen
          const label = id === 'misc'
            ? 'Sonstiges'
            : id.charAt(0).toUpperCase() + id.slice(1);
          set.set(id, label);
        }
      });
    });

    return Array.from(set.entries()).map(([id, label]) => ({ id, label }));
  }

  /* --------------------------- DOM / Template ----------------------------- */

  /** HTML-Struktur ins #build-dock schreiben (ohne HUD-Abhängigkeit) */
  function buildDockDom(){
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
            Keine Gebäude in dieser Kategorie.
          </div>
        </div>
      </div>
    `.trim();

    $dock.innerHTML = html;

    // Handles setzen
    $head     = $dock.querySelector('.build-dock__head');
    $title    = $dock.querySelector('.build-dock__title');
    $count    = $dock.querySelector('#build-count');
    $btnClose = $dock.querySelector('#build-close');
    $body     = $dock.querySelector('.build-dock__body');
    $cats     = $dock.querySelector('#build-cats');
    $grid     = $dock.querySelector('#build-grid');
    $empty    = $dock.querySelector('#build-empty');

    if (!$head || !$body || !$cats || !$grid || !$count){
      ERR('DOM: Build-Dock-Innenstruktur nicht vollständig.');
    }
  }

  /* --------------------------- Render-Funktionen -------------------------- */

  /** Kategorien-Buttons neu aufbauen */
  function renderCategories(){
    if (!$cats) return;

    $cats.innerHTML = '';

    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = cat.label;
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

  /** Baut Kosten-Chips für ein Gebäude */
  function buildCostChips(b){
    const wrap = document.createElement('div');
    wrap.className = 'build-costs';

    const list = normalizeCosts(b);
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

  /** Klick auf eine Karte → Gebäude auswählen (Vorschau/Bauen) */
  function onCardClick(building){
    INF('Gebäude gewählt:', building.id || building.name);
    emit('req:build:select', { building });
  }

  /** Karten-Gitter neu rendern (nach Kategorie-Filter) */
  function renderGrid(){
    if (!$grid || !$empty) return;

    $grid.innerHTML = '';

    const list = byCat(BUILDINGS, ACTIVE_CAT);
    if (!list.length){
      $empty.classList.remove('hidden');
      return;
    }
    $empty.classList.add('hidden');

    list.forEach(b => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'build-card';
      card.dataset.id = b.id || '';

      // Titel
      const titleEl = document.createElement('div');
      titleEl.className = 'build-card__title';
      titleEl.textContent = b.name || b.title || b.id || 'Unbenannt';

      // Bild
      const img = document.createElement('img');
      img.className = 'build-card__img';
      img.alt = b.name || b.id || '';
      img.src = b.icon || iconBld(b.id || 'unknown');

      // Kosten
      const costsEl = buildCostChips(b);

      card.appendChild(titleEl);
      card.appendChild(img);
      card.appendChild(costsEl);

      card.addEventListener('click', () => onCardClick(b));
      $grid.appendChild(card);
    });

    // Gesamtanzahl aktualisieren
    if ($count){
      $count.textContent = `${BUILDINGS.length} Gebäude`;
    }
  }

  /* --------------------------- Open / Close ------------------------------- */

  function openDock(){
    if (IS_OPEN) return;
    IS_OPEN = true;
    $dock.hidden = false;
    $dock.classList.add('fade-in');
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

  /* --------------------------- Init aus Registry -------------------------- */

  function initFromRegistry(detail){
    // Buildings aus Detail oder globaler Registry holen
    const fromDetail = detail && (detail.buildings || detail.BUILDINGS);
    const fromGlobal = window.Registry && (window.Registry.buildings || window.Registry.BUILDINGS);

    const list = fromDetail || fromGlobal || [];
    if (!Array.isArray(list) || !list.length){
      WRN('Keine Buildings in Registry gefunden – Baumenü bleibt leer.');
    }

    BUILDINGS  = list;
    CATEGORIES = deriveCategories(BUILDINGS);
    INF(`Registry-Init: ${BUILDINGS.length} Gebäude, ${CATEGORIES.length} Kategorien.`);

    if (!INIT_DONE){
      buildDockDom();

      // Close-Button
      $btnClose = document.getElementById('build-close');
      if ($btnClose){
        $btnClose.addEventListener('click', closeDock);
      }

      // Build-Button (FAB)
      const btn = getBtn();
      if (btn){
        btn.addEventListener('click', toggleDock);
      } else {
        WRN('#btn-build nicht gefunden – Dock nur programmatisch nutzbar.');
      }

      INIT_DONE = true;
    }

    renderCategories();
    renderGrid();
  }

  /* --------------------------- Event-Hooks -------------------------------- */

  // Registry-Ready vom Core (wie beim HUD)
  window.addEventListener('cb:registry:ready', (ev) => {
    INF('cb:registry:ready empfangen (Build-Menü).');
    initFromRegistry(ev.detail || {});
  });

  // Fallback: Falls Registry schon VOR diesem Skript da war
  if (window.Registry && (window.Registry.buildings || window.Registry.BUILDINGS)){
    INF('Registry bereits vorhanden – Init sofort.');
    initFromRegistry({ buildings: window.Registry.buildings || window.Registry.BUILDINGS });
  }

  LOG('ui-build.js geladen (v25.11.16-final+costs-1).');
})();
