/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.12.20-final-touchfix
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

  // Toast (Build-Deny Hinweis) – wird im buildDockDom() erzeugt
  let $toast;

  /* ------------------------------ Helper ---------------------------------- */
  const iconRes = id => `assets/icons/resources/${id}.png`;
  const iconBld = id => (ICONS_BASE_BUILDINGS || 'assets/icons/buildings/') + (id || 'unknown') + '.png';
  /**
   * Event-Emitter
   * - Wir markieren jedes Event mit __src:'ui-build', damit wir in den
   *   Listenern externe Dispatches von alten Inline-Scripts/Bridges
   *   erkennen und NICHT doppelt reagieren.
   */
  const emit = (name, detail = {}) => {
    const d = (detail && typeof detail === 'object') ? detail : { value: detail };
    if (!d.__src) d.__src = 'ui-build';
    window.dispatchEvent(new CustomEvent(name, { detail: d }));
  };

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
        <!-- Toast: Kurzer Hinweis für Spieler ohne Inspector (z.B. nicht genug Holz) -->
        <div id="build-toast" class="build-toast" style="display:none" aria-live="polite"></div>
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
    $toast      = $dock.querySelector('#build-toast');
    $toast      = $dock.querySelector('#build-toast');

    // ------------------------ Build-Deny Toast -------------------------
    // Hinweis für Spieler OHNE Inspector: „Nicht genug Ressourcen“ usw.
    // Wird nur vorbereitet; Anzeige erfolgt im globalen Event-Listener.
    $toast = document.createElement('div');
    $toast.id = 'build-toast';
    $toast.className = 'build-toast';
    $toast.style.display = 'none';
    // Toast direkt unter dem Kopf platzieren (innerhalb des Holzrahmens)
    if ($head && $head.parentNode){
      $head.parentNode.insertBefore($toast, $head.nextSibling);
    } else {
      $dock.appendChild($toast);
    }

    if ($btnClose){
      $btnClose.addEventListener('click', closeDock);
    }

    // IMPORTANT:
    // Der Build-Button wird *zentral* in bindBuildButton() verdrahtet.
    // (Sonst kommt es auf iOS schnell zu Doppel-Events: touch -> click,
    // plus evtl. Inline-Scripts -> "kurz offen, sofort wieder zu".)
    const btnBuild = getBtnBuild();
    if (!btnBuild){
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
    emit('cb:build:open', { open: true, from: src || 'ui' });
  }

  function closeDock(src){
    if (!IS_OPEN) return;
    IS_OPEN = false;
    $dock.hidden = true;
    try{ $dock.style.display = ''; }catch(e){}
    emit('cb:build:close', { open: false, from: src || 'ui' });
  }

  function toggleDock(src){
    IS_OPEN ? closeDock(src) : openDock(src);
  }

  /* -------------------- Build-Deny → UI Toast --------------------------- */
  // Kommt aus core/game.js: window.dispatchEvent(new CustomEvent('cb:build:deny', {detail:{...}}))
  // Wir zeigen daraus einen kurzen Hinweis an. Keine harte Abhängigkeit vom Inspector.
  (function attachBuildDenyToast(){
    if (window.__BUILD_DENY_TOAST_ATTACHED__) return;
    window.__BUILD_DENY_TOAST_ATTACHED__ = true;

    let hideTimer = 0;

    function resName(id){
      switch(String(id||'')){
        case 'wood':  return 'Holz';
        case 'stone': return 'Stein';
        case 'food':  return 'Nahrung';
        case 'gold':  return 'Gold';
        default:      return String(id||'');
      }
    }

    function formatMissing(detail){
      const missing = detail?.missing || {};
      const parts = [];
      for (const [res, m] of Object.entries(missing)){
        const need = Number(m?.need ?? 0);
        const have = Number(m?.have ?? 0);
        const miss = Number(m?.missing ?? Math.max(0, need - have));
        if (miss > 0) parts.push(`${resName(res)} (fehlt ${miss})`);
      }
      return parts.length ? parts.join(', ') : 'Ressourcen fehlen';
    }

    function ensureToastEl(){
      // Falls buildDockDom() noch nicht lief, existiert $toast noch nicht.
      if ($toast && $toast.isConnected) return $toast;
      const el = document.getElementById('build-toast');
      if (el) { $toast = el; return el; }
      return null;
    }

    function showToast(msg){
      const el = ensureToastEl();
      if (!el) return;

      el.textContent = msg;
      el.style.display = 'block';

      // wenn Dock geschlossen ist: trotzdem kurz anzeigen (läuft im Dock mit)
      // optional: könnte auch openDock() triggern – machen wir NICHT.

      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(()=>{
        try{ el.style.display = 'none'; }catch(e){}
      }, 1800);
    }

    window.addEventListener('cb:build:deny', (ev)=>{
      const d = ev?.detail || {};

      // Nur „nicht genug Ressourcen“ aktuell relevant
      if (d.reason === 'notenough'){
        showToast(`Nicht genug: ${formatMissing(d)}`);
        return;
      }

      // Optionale generische Gründe (kann später erweitert werden)
      if (d.reason){
        showToast('Bauen nicht möglich');
      }
    }, { passive:true });
  })();

  
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

  // Button robust binden (iOS/Safari: touch -> synthetic click vermeiden)
  function bindBuildButton(){
    const btn = document.getElementById('btn-build');
    if (!btn) return;
    if (btn.__uiBuildBound) return;
    btn.__uiBuildBound = true;
    // Wir toggeln NUR auf pointerup (und fallback click),
    // und blocken den direkt danach folgenden synthetic click.
    let lastToggleAt = 0;
    const CLICK_SUPPRESS_MS = 420;

    const doToggle = (ev, reason)=>{
      lastToggleAt = Date.now();
      INF(`btn-build ${reason} → toggleDock()`);
      try{ ev.preventDefault(); }catch(e){}
      try{ ev.stopPropagation(); }catch(e){}
      toggleDock('btn:' + reason);
    };

    btn.addEventListener('pointerup', (ev)=> doToggle(ev, 'pointerup'), { passive:false });

    btn.addEventListener('click', (ev)=>{
      const dt = Date.now() - lastToggleAt;
      if (dt >= 0 && dt < CLICK_SUPPRESS_MS){
        // synthetic click nach touch/pointerup → ignorieren
        try{ ev.preventDefault(); }catch(e){}
        try{ ev.stopPropagation(); }catch(e){}
        return;
      }
      doToggle(ev, 'click');
    }, { passive:false });

    INF('#btn-build gebunden (pointerup + click-fallback).');
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindBuildButton, { once:true });
  } else {
    bindBuildButton();
  }

  /* =======================================================================
   * Build-Deny → UI-Toast (Spieler ohne Inspector)
   *
   * Erwartetes Event (kommt aus core/game.js):
   *   cb:build:deny { reason:'notenough', missing:{wood:{need,have,missing},...} }
   *
   * Ziel:
   *   Kurzer Hinweis im Baumenü (z.B. "Nicht genug: Holz (fehlt 2)")
   * ===================================================================== */
  (function attachBuildDenyToast(){
    if (window.__BUILD_DENY_TOAST_ATTACHED__) return;
    window.__BUILD_DENY_TOAST_ATTACHED__ = true;

    let hideTimer = 0;

    function ensureToastEl(){
      // DOM kann später kommen (Registry/Timeout). Deshalb: immer tolerant.
      if ($toast && $toast.isConnected) return $toast;
      $toast = document.getElementById('build-toast');
      return ($toast && $toast.isConnected) ? $toast : null;
    }

    function niceResName(resId){
      switch(String(resId||'').toLowerCase()){
        case 'wood':  return 'Holz';
        case 'stone': return 'Stein';
        case 'food':  return 'Nahrung';
        case 'gold':  return 'Gold';
        default:      return String(resId||'Ressource');
      }
    }

    function formatMissing(detail){
      const missing = detail?.missing || {};
      const parts = [];
      for (const [res, info] of Object.entries(missing)){
        const need = Number(info?.need ?? 0);
        const have = Number(info?.have ?? 0);
        const miss = Number(info?.missing ?? Math.max(0, need - have));
        if (miss > 0){
          parts.push(`${niceResName(res)} (fehlt ${miss})`);
        }
      }
      return parts.length ? parts.join(', ') : 'Ressourcen fehlen';
    }

    function showToast(msg){
      const el = ensureToastEl();
      if (!el) return;

      el.textContent = msg;
      el.style.display = 'block';

      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(()=>{
        const el2 = ensureToastEl();
        if (el2) el2.style.display = 'none';
      }, 1800);
    }

    window.addEventListener('cb:build:deny', (ev)=>{
      const d = (ev && ev.detail) || {};
      // Nur anzeigen, wenn das Dock existiert und/oder geöffnet ist.
      // (Wenn es geschlossen ist, stört es nicht – aber wir spammen auch nicht.)
      if (!$dock) return;

      if (d.reason === 'notenough'){
        showToast(`Nicht genug: ${formatMissing(d)}`);
      } else {
        // Optional: andere Gründe später (blockedTerrain, tooClose, ...)
        showToast('Bauen hier nicht möglich');
      }
    }, { passive:true });
  })();

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
