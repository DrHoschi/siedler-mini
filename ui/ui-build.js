/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.16-final+costs-json2+hook
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
 *      • Kosten-Chips unten (Icons + Zahl) innerhalb des Holzrahmens
 *  - Öffnen/Schließen über #btn-build und Close-Button
 *  - Klick-Handling fürs Platzieren übernimmt ui/ui-build-hook.js
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
  /* =======================================================================
   * WICHTIG (v25.12.21c):
   * Dieses File ist das *Legacy/Fallback*-Baumenü. Wenn das "neue"/finale
   * Baumenü (ui-build-v14 + ui-build-final) im Projekt aktiv ist, darf
   * dieses Dock NIEMALS aufgehen – sonst bekommst du genau das Verhalten
   * "nur beim gedrückt halten" bzw. Doppel-Toggles.
   *
   * Lösung: Wir erkennen das finale Menü (Marker/Globals/DOM) und schalten
   * dieses Legacy-Dock automatisch komplett ab.
   * ======================================================================= */
  const __LEGACY_HAS_FINAL_MENU__ = ()=>{
    try{
      if (window.__BUILD_MENU_FINAL_ACTIVE__ || window.BuildMenuFinal || window.UIBuildMenuFinal) return true;
      // DOM-Marker, die wir in den Final-Styles/Final-JS typischerweise haben
      if (document.querySelector('#buildmenu-final, #ui-buildmenu-final, .buildmenu-final, [data-buildmenu="final"]')) return true;
      // Wenn die v14 CSS-Klassen/Strukturen vorhanden sind (Panel mit Tabs/Karten)
      if (document.querySelector('.ui-build-v14, .buildmenu-v14, .buildmenu-tabs, .buildmenu-grid')) return true;
    }catch(e){}
    return false;
  };

  // Wenn final aktiv: Legacy sofort deaktivieren (Dock verstecken, keine Listener)
  if (__LEGACY_HAS_FINAL_MENU__()){
    try{
      const dock = document.getElementById('build-dock');
      if (dock){ dock.hidden = true; dock.style.display='none'; dock.style.pointerEvents='none'; }
    }catch(e){}
    (window.CBLog?.warn || console.warn)('[build] Legacy ui-build.js deaktiviert (Final-Baumenü erkannt).');
    return;
  }


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

  /** Kosten zu [{id, amount}] normalisieren (tolerant) */
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
  // Hinweis: Klick-Handling für Platzieren kommt aus ui/ui-build-hook.js
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

      // **************** WICHTIG für build-hook ****************************
      if (b.id){
        card.setAttribute('data-building-id', b.id);   // vom Hook ausgelesen
      }

      // Größe bestimmen (w/h oder size[0]/[1]), Fallback 3x3
      const w =
        (b.w | 0) ||
        (b.size && (b.size.w | 0)) ||
        (Array.isArray(b.size) && (b.size[0] | 0)) ||
        3;
      const h =
        (b.h | 0) ||
        (b.size && (b.size.h | 0)) ||
        (Array.isArray(b.size) && (b.size[1] | 0)) ||
        3;

      card.setAttribute('data-w', w);
      card.setAttribute('data-h', h);
      // ********************************************************************

      const titleEl = document.createElement('div');
      titleEl.className = 'build-card__title';
      titleEl.textContent = b.name || b.title || b.id || 'Unbenannt';

      const img = document.createElement('img');
      img.className = 'build-card__img';
      img.alt = b.name || b.id || '';
      img.src = b.icon || iconBld(b.id || 'unknown');

      const costsEl = buildCostChips(b);

      // Innerer Container, damit Bild + Kosten zusammen im Holzrahmen sitzen
      const inner = document.createElement('div');
      inner.className = 'build-card__inner';
      inner.appendChild(img);
      inner.appendChild(costsEl);

      card.appendChild(titleEl);
      card.appendChild(inner);

      // KEIN eigener Click-Handler hier!
      // → ui/ui-build-hook.js fängt den Klick auf [data-building-id] ab
      $grid.appendChild(card);
    });

    if ($countLabel){
      $countLabel.textContent = `${BUILDINGS.length} Gebäude`;
    }
  }

  /* -------------------------- Open / Close -------------------------------- */
  function openDock(src){
    if (IS_OPEN) return;
    IS_OPEN = true;
    $dock.hidden = false;
    // Failsafe gegen CSS/hidden-Probleme (iOS/Safari)
    try{ $dock.style.display = 'block'; $dock.style.pointerEvents='auto'; }catch(e){}
    emit(''cb:build:open', { open: true });
  }

  function closeDock(src){
    if (!IS_OPEN) return;
    IS_OPEN = false;
    $dock.hidden = true;
    try{ $dock.style.display = ''; }catch(e){}
    emit(''cb:build:close', { open: false });
  }

  function toggleDock(){
    IS_OPEN ? closeDock() : openDock();
  }

  
  /* --------------------- Externe Open/Close Events ----------------------- */
  function isExternal(ev){
    const d = (ev && ev.detail) || {};
    return d.__src !== 'ui-build';
  }

  function onExtOpen(ev){
    if (!isExternal(ev)) return;
    INF('cb:build:open empfangen → openDock()');
    openDock('event');
  }
  function onExtClose(ev){
    if (!isExternal(ev)) return;
    INF('cb:build:close empfangen → closeDock()');
    closeDock('event');
  }
  function onExtToggle(ev){
    if (!isExternal(ev)) return;
    INF('cb:build:toggle empfangen → toggleDock()');
    toggleDock('event');
  }

  // Lausche auf window UND document (Inline-Scripts dispatchen manchmal auf document)
  ['cb:build:open','cb:build:close','cb:build:toggle'].forEach((name)=>{
    window.addEventListener(name, name.endsWith('open')?onExtOpen:(name.endsWith('close')?onExtClose:onExtToggle));
    document.addEventListener(name, name.endsWith('open')?onExtOpen:(name.endsWith('close')?onExtClose:onExtToggle));
  });

  // Button robust binden (iOS: pointerdown/click/touchend)
  function bindBuildButton(){
    const btn = document.getElementById('btn-build');
    if (!btn) return;
    if (btn.__uiBuildBound) return;
    btn.__uiBuildBound = true;
    const handler = (ev)=>{
      INF('btn-build input → toggleDock()');
      try{ ev.preventDefault(); }catch(e){}
      toggleDock('btn');
    };
    btn.addEventListener('pointerdown', handler, { passive:false });
    btn.addEventListener('click', handler, { passive:false });
    btn.addEventListener('touchend', handler, { passive:false });
    INF('#btn-build gebunden (pointerdown+click+touchend).');
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindBuildButton, { once:true });
  } else {
    bindBuildButton();
  }

/* ------------------------- Init aus Registry ---------------------------- */
  function readBuildingsFromRegistry(){
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
        if (!CATEGORIES.length){
          CATEGORIES = deriveCategories(BUILDINGS);
        }
        renderCategories();
        renderGrid();
      } else {
        WRN('Registry liefert keine Gebäude – Fallback auf buildings.json.');
        loadFromJson('registry-fallback:' + tag);
      }
    } catch(err){
      ERR('initFromRegistry Fehler:', err);
      loadFromJson('registry-error:' + tag);
    }
  }

  /* --------------------------- Event-Wiring ------------------------------- */
  // Spätestens beim Game-Start initialisieren (falls cb:registry:ready schon vor Script-Load feuert)
  window.addEventListener('cb:game:start', ()=>{
    if (!BUILDINGS.length){
      INF('cb:game:start → initFromRegistry(game-start)');
      initFromRegistry('cb:game:start');
    } else {
      // Falls Liste da ist, aber DOM noch nicht gerendert
      if (!$dock.querySelector('.build-cats') && !$dock.querySelector('.build-grid')){
        INF('cb:game:start → Dock-DOM nachziehen');
        buildDockDom();
        if (!CATEGORIES.length) CATEGORIES = deriveCategories(BUILDINGS);
        renderCategories();
        renderGrid();
      }
    }
  }, { once:true });

  // Kompatibilität: alternative Registry-Eventnamen
  ['cb:registry-ready','cb:registry.ready'].forEach((evtName)=>{
    window.addEventListener(evtName, ()=>initFromRegistry(evtName), { once:true });
  });

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

  setTimeout(() => {
    if (!BUILDINGS.length){
      if (window.Registry){
        initFromRegistry('timeout-fallback');
      } else {
        loadFromJson('timeout-no-registry');
      }
    }
  }, 200);

  LOG('ui-build geladen (v25.11.16-final+costs-json2+hook).');
})();
