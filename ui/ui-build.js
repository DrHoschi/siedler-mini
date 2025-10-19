/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.10.19-final3
 * Modul    : Baumenü (Build-Dock) – Kategorien + Kartenraster
 *
 * Lauscht  : cb:ui-ready, cb:assets-ready, cb:registry:ready
 * Sendet   : cb:build:open / cb:build:close, req:place:begin { building }
 * DOM      : #build-dock (Container), #btn-build (Toggle), Icons unter assets/icons
 * Hinweise : - Failsafe legt #build-dock nur an, wenn er fehlt.
 *            - Doppel-Initialisierung verhindert (INIT_DONE).
 *            - Schließende Klammern + IIFEs sind sauber abgeschlossen :)
 * ========================================================================== */

/* --- Failsafe: #build-dock sicherstellen (greift nur, wenn nicht vorhanden) --- */
(function FailsafeEnsureDock(){
  const MOD = 'build';
  const ok  = (m)=> (window.CBLog?.ok||console.log)(`[${MOD}] ${m}`);
  let el = document.getElementById('build-dock');
  if (!el){
    el = document.createElement('div');
    el.id = 'build-dock';
    el.hidden = true;            // Sichtbarkeit steuert das UI-Modul
    el.style.overflow = 'auto';  // minimale Sicherheit
    document.body.appendChild(el);
    ok('Failsafe: #build-dock erzeugt.');
  }
})();

/* --- Hauptmodul ------------------------------------------------------------- */
(function(){
  'use strict';

  // [00] Logger (robust; crasht nicht bei exotischem CBLog)
  const __safeLog = (fn, tag, ...m) => {
    try {
      if (window.CBLog && typeof window.CBLog[fn] === 'function') {
        try { window.CBLog[fn](tag, ...m); } catch { window.CBLog[fn]([tag, ...m]); }
      } else { (console[fn] || console.log)(tag, ...m); }
    } catch { try { (console[fn] || console.log)(tag, ...m); } catch(_){} }
  };
  const LOG = (...m)=>__safeLog('log',  '[build]', ...m);
  const INF = (...m)=>__safeLog('info', '[build]', ...m);
  const WRN = (...m)=>__safeLog('warn', '[build]', ...m);
  const ERR = (...m)=>__safeLog('error','[build]', ...m);

  // [01] DOM-Hooks
  const $dock     = document.getElementById('build-dock');  // nach Failsafe vorhanden
  const $btnBuild = document.getElementById('btn-build');   // optional (HUD)
  if (!$dock){ ERR('DOM: #build-dock fehlt'); return; }
  if (!$btnBuild){ WRN('DOM: #btn-build fehlt – Dock nur per API steuerbar'); }

  // [02] State
  let BUILDINGS   = [];
  let CATEGORIES  = [];
  let ACTIVE_CAT  = 'all';
  let IS_OPEN     = false;
  let INIT_DONE   = false;   // Debounce initAndRender

  // [03] Utils
  const iconRes = id => `assets/icons/resources/${id}.png`;
  const iconBld = id => `assets/icons/buildings/${id}.png`;
  const emit = (name, detail={}) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const byCat = (list, cat) => (cat === 'all') ? list : list.filter(b => (b.categories||[]).includes(cat));

  function normalizeBuilding(raw){
    const id    = String(raw.id || '').trim();
    const name  = String(raw.name || id || 'Unbenannt');
    let cats    = [];
    if (Array.isArray(raw.categories)) cats = raw.categories.map(String);
    else if (raw.category)            cats = [String(raw.category)];
    else                              cats = ['misc'];
    const image = raw.image || iconBld(id);

    let cost = [];
    if (Array.isArray(raw.cost)) {
      cost = raw.cost.map(c => ({ id: String(c.id), amount: Number(c.amount||0) }))
                     .filter(c => c.id && c.amount > 0);
    } else if (raw.cost && typeof raw.cost === 'object') {
      cost = Object.keys(raw.cost).map(k => ({ id:String(k), amount:Number(raw.cost[k]||0) }))
                                  .filter(c => c.amount > 0);
    }
    return { id, name, categories: cats, image, cost };
  }

  // [04] Daten: Registry → Fallback
  async function loadBuildings(){
    try {
      if (window.Registry && typeof Registry.list === 'function') {
        const fromReg = Registry.list('buildings') || [];
        if (fromReg.length){
          BUILDINGS = fromReg.map(normalizeBuilding);
          INF('Datenquelle: Registry', BUILDINGS.length);
          return;
        }
      }
    } catch(e) { WRN('Registry.list("buildings") Fehler:', e); }
    try {
      const res  = await fetch('data/buildings.json', { cache:'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      const arr  = Array.isArray(json) ? json : (json?.buildings || []);
      BUILDINGS  = arr.map(normalizeBuilding);
      INF('Datenquelle: data/buildings.json', BUILDINGS.length);
    } catch(e) {
      ERR('Fallback-Laden fehlgeschlagen:', e);
      BUILDINGS = [];
    }
  }

  function buildCategories(){
    const map = new Map();
    BUILDINGS.forEach(b => (b.categories||[]).forEach(c => map.set(c, (map.get(c)||0)+1)));
    CATEGORIES = Array.from(map.entries())
      .map(([id, count]) => ({ id, name: id, count }))
      .sort((a,b)=> a.id.localeCompare(b.id));
    CATEGORIES.unshift({ id:'all', name:'Alles', count: BUILDINGS.length });
    if (!CATEGORIES.some(c => c.id === ACTIVE_CAT)) ACTIVE_CAT = 'all';
  }

  // [05] Render – Grundgerüst
  function renderDockSkeleton(){
    $dock.innerHTML = `
      <div class="build-dock__head">
        <div class="build-dock__title">
          <span>Baumenü</span>
          <span class="build-dock__count" id="build-count">0 Gebäude</span>
        </div>
        <button class="build-dock__close" id="build-close" aria-label="Schließen">×</button>
      </div>
      <div class="build-dock__body">
        <div class="build-cats"  id="build-cats"></div>
        <div class="build-grid"  id="build-grid"></div>
        <div class="build-empty hidden" id="build-empty">
          Keine Gebäude gefunden. Prüfe <code>data/buildings.json</code> oder Registry-Kategorien.
        </div>
      </div>
    `;
    $dock.querySelector('#build-close')?.addEventListener('click', closeDock);
  }

  // [06] Render – Kategorien
  function renderCategories(){
    const $cats  = $dock.querySelector('#build-cats');
    const $count = $dock.querySelector('#build-count');
    if (!$cats) return;

    $cats.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'build-cat' + (cat.id === ACTIVE_CAT ? ' is-active' : '');
      btn.setAttribute('data-cat', cat.id);
      btn.innerHTML = `<span class="build-cat__name">${cat.name}</span><span class="build-cat__cnt">${cat.count}</span>`;
      btn.addEventListener('click', () => { ACTIVE_CAT = cat.id; renderCategories(); renderGrid(); });
      $cats.appendChild(btn);
    });
    if ($count) $count.textContent = `${BUILDINGS.length} Gebäude`;
  }

  // [07] Render – Grid
  function renderGrid(){
    const $grid  = $dock.querySelector('#build-grid');
    const $empty = $dock.querySelector('#build-empty');
    if (!$grid) return;

    const list = byCat(BUILDINGS, ACTIVE_CAT);
    $grid.innerHTML = '';
    if (!list.length){
      $empty?.classList.remove('hidden');
      $empty && ($empty.style.display = 'block');
      return;
    }
    $empty?.classList.add('hidden');
    $empty && ($empty.style.display = '');

    list.forEach(b=>{
      const $card = document.createElement('button');
      $card.className = 'build-card';
      $card.setAttribute('data-bid', b.id);
      $card.setAttribute('aria-label', `Gebäude ${b.name}`);

      const $title = document.createElement('div');
      $title.className = 'build-card__title';
      $title.textContent = b.name;

      const $img = document.createElement('img');
      $img.className = 'build-card__img';
      $img.loading   = 'lazy';
      $img.alt       = b.name;
      $img.src       = b.image || iconBld(b.id);

      const $costs = document.createElement('div');
      $costs.className = 'build-costs';
      (b.cost || []).forEach(c=>{
        const $c = document.createElement('div');
        $c.className = 'build-cost';
        $c.innerHTML = `
          <img class="build-cost__icon" src="${iconRes(c.id)}" alt="${c.id}">
          <span class="build-cost__amt">x${c.amount}</span>
        `;
        $costs.appendChild($c);
      });

      $card.appendChild($title);
      $card.appendChild($img);
      $card.appendChild($costs);
      $card.addEventListener('click', () => {
        INF('select', b.id);
        emit('req:place:begin', { building: b });
      });

      $grid.appendChild($card);
    });
  }

  // [08] Öffnen/Schließen/Toggle
  function openDock(){
    if (IS_OPEN) return;
    IS_OPEN = true;
    $dock.hidden = false;
    $dock.classList.remove('hidden');
    $btnBuild?.setAttribute('aria-expanded', 'true');
    emit('cb:build:open');
  }
  function closeDock(){
    if (!IS_OPEN) return;
    IS_OPEN = false;
    $dock.classList.add('hidden');
    $btnBuild?.setAttribute('aria-expanded', 'false');
    emit('cb:build:close');
  }
  function toggleDock(){ IS_OPEN ? closeDock() : openDock(); }

  // ESC schließt
  window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeDock(); }, { passive:true });

  // [09] Init (einmalig)
  async function initAndRender(){
    if (INIT_DONE) return;           // Debounce
    INIT_DONE = true;
    try {
      renderDockSkeleton();
      await loadBuildings();
      buildCategories();
      renderCategories();
      renderGrid();
      INF('bereit', { buildings: BUILDINGS.length, categories: CATEGORIES.length });
    } catch(e){
      ERR('initAndRender Fehler:', e);
      const $empty = $dock.querySelector('#build-empty');
      if ($empty){
        $empty.textContent = 'Fehler beim Laden des Baumenüs. Details in der Konsole.';
        $empty.classList.remove('hidden');
      }
    }
  }

  // [10] UI Wiring
  function wireUI(){
    if ($btnBuild){
      $btnBuild.hidden = false;
      $btnBuild.setAttribute('aria-expanded','false');
      $btnBuild.addEventListener('click', toggleDock);
    }
    $dock.classList.add('hidden');   // Start: geschlossen
  }

  // [11] Events (einmalig)
  window.addEventListener('cb:ui-ready',        wireUI,        { once:true });
  window.addEventListener('cb:assets-ready',    initAndRender, { once:true });
  window.addEventListener('cb:registry:ready',  initAndRender, { once:true });

  // Standalone-Fallback (kein Auto-Init hier, damit Reihenfolge im Spiel stimmt)
  LOG('geladen v25.10.19-final3');
})();
