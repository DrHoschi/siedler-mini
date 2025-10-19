/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.10.19
 * Modul    : Baumenü (Build-Dock) – Kategorien + Kartenraster
 *
 * Kurzbeschreibung
 *   - Dock-UI zum Auswählen von Gebäuden.
 *   - Datenquelle: Registry (bevorzugt) → Fallback data/buildings.json.
 *   - Kategorienleiste mit Zählern, darunter Kartengrid mit Kosten.
 *   - Click auf Karte -> req:place:begin { building }.
 *
 * Lauscht auf
 *   - cb:ui-ready        : UI ankabeln (Buttons, Dock-Verhalten)
 *   - cb:assets-ready    : erlaubt Fallback-Laden
 *   - cb:registry:ready  : lädt Gebäudedaten aus Registry
 *
 * Sendet
 *   - cb:build:open / cb:build:close
 *   - req:place:begin { building }
 *
 * DOM-Verträge
 *   - #build-dock  : Dock-Container (vom Layout-Glue; Failsafe legt ihn ggf. an)
 *   - #btn-build   : optionaler Toggle-Button (z.B. in HUD)
 *
 * Hinweise
 *   - Der Failsafe erzeugt nur dann einen eigenen, fixierten Dock-Container,
 *     wenn #build-dock beim Laden NOCH nicht existiert (z.B. ohne Layout-Glue).
 *   - Wenn dein Layout-Glue (#game-stage-Grid) #build-dock bereits liefert,
 *     greift der Failsafe NICHT ein – DOM bleibt unberührt.
 * ========================================================================== */

(function FailsafeEnsureDock(){
  const MOD = 'build';
  const ok  = (m)=> (window.CBLog?.ok||console.log)(`[${MOD}] ${m}`);

  // Wenn #build-dock fehlt, Container selbst anlegen (nur dann stylen!)
  let el = document.getElementById('build-dock');
  if (!el){
    el = document.createElement('div');
    el.id = 'build-dock';
    // Failsafe-Styles (nur für den Notfall). Im Grid-Fall liefert CSS/Layout das Aussehen.
    el.style.cssText = `
      position: fixed;
      right: 0;
      top: calc(56px + env(safe-area-inset-top,0px));
      bottom: 0;
      width: min(340px,48vw);
      background: rgba(20,22,26,.92);
      border-left: 1px solid rgba(255,255,255,.08);
      color:#eaeaea;
      z-index:10010;
      display:none;
      padding:10px;
      overflow:auto;
    `;
    document.body.appendChild(el);
    ok('Failsafe: #build-dock erzeugt.');
  }
})();

(() => {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────────
  // [00] Sichere Logger
  // ────────────────────────────────────────────────────────────────────────────
  const __safeLog = (fn, tag, ...m) => {
    try {
      if (window.CBLog && typeof window.CBLog[fn] === 'function') {
        // CBLog kann formatierte Strings oder Arrays erwarten – beides tolerieren.
        try { window.CBLog[fn](tag, ...m); }
        catch { window.CBLog[fn]([tag, ...m]); }
      } else {
        (console[fn] || console.log)(tag, ...m);
      }
    } catch {
      try { (console[fn] || console.log)(tag, ...m); } catch(_) {}
    }
  };
  const LOG = (...m)=>__safeLog('log',  '[build]', ...m);
  const INF = (...m)=>__safeLog('info', '[build]', ...m);
  const WRN = (...m)=>__safeLog('warn', '[build]', ...m);
  const ERR = (...m)=>__safeLog('error','[build]', ...m);

  // ────────────────────────────────────────────────────────────────────────────
  // [01] DOM-Hooks (nach Failsafe existiert #build-dock sicher)
  // ────────────────────────────────────────────────────────────────────────────
  const $dock     = document.getElementById('build-dock');
  const $btnBuild = document.getElementById('btn-build'); // optional (z.B. aus HUD)

  if (!$dock) { ERR('DOM: #build-dock fehlt'); return; }
  if (!$btnBuild) { WRN('DOM: #btn-build fehlt – Dock nur per API steuerbar'); }

  // ────────────────────────────────────────────────────────────────────────────
  // [02] State
  // ────────────────────────────────────────────────────────────────────────────
  let BUILDINGS   = [];     // normalisierte Gebäudeliste
  let CATEGORIES  = [];     // [{id, name, count}, ...]
  let ACTIVE_CAT  = 'all';
  let IS_OPEN     = false;
  let INIT_DONE   = false;  // verhindert Doppeleinstieg (assets-ready + registry-ready)

  // ────────────────────────────────────────────────────────────────────────────
  // [03] Utilities
  // ────────────────────────────────────────────────────────────────────────────
  const iconRes = id => `assets/icons/resources/${id}.png`;
  const iconBld = id => `assets/icons/buildings/${id}.png`;

  const emit = (name, detail={}) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  const byCat = (list, cat) => (cat === 'all') ? list : list.filter(b => (b.categories||[]).includes(cat));

  // Toleranter Normalizer (alte/teilweise Felder werden abgefedert)
  function normalizeBuilding(raw){
    const id    = String(raw.id || '').trim();
    const name  = String(raw.name || id || 'Unbenannt');

    let cats = [];
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

  // ────────────────────────────────────────────────────────────────────────────
  // [04] Daten laden: Registry → Fallback JSON
  // ────────────────────────────────────────────────────────────────────────────
  async function loadBuildings(){
    // 4.1 Registry (bevorzugt)
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

    // 4.2 Fallback JSON
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

  // Kategorienliste aus Gebäuden aggregieren
  function buildCategories(){
    const map = new Map();
    BUILDINGS.forEach(b => (b.categories||[]).forEach(c => map.set(c, (map.get(c)||0)+1)));
    CATEGORIES = Array.from(map.entries())
      .map(([id, count]) => ({ id, name: id, count }))
      .sort((a,b)=> a.id.localeCompare(b.id));
    CATEGORIES.unshift({ id:'all', name:'Alles', count: BUILDINGS.length });
    if (!CATEGORIES.some(c => c.id === ACTIVE_CAT)) ACTIVE_CAT = 'all';
  }

  // ────────────────────────────────────────────────────────────────────────────
  // [05] Render – Dock-Grundgerüst
  // ────────────────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────────────────
  // [06] Render – Kategorien
  // ────────────────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────────────────
  // [07] Render – Grid
  // ────────────────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────────────────
  // [08] Öffnen / Schließen / Toggle
  // ────────────────────────────────────────────────────────────────────────────
  function openDock(){
    if (IS_OPEN) return;
    IS_OPEN = true;
    $dock.classList.remove('hidden');
    $dock.style.display = '';                // falls keine .hidden-Klasse existiert
    $btnBuild?.setAttribute('aria-expanded', 'true');
    emit('cb:build:open');
  }
  function closeDock(){
    if (!IS_OPEN) return;
    IS_OPEN = false;
    $dock.classList.add('hidden');
    $dock.style.display = 'none';
    $btnBuild?.setAttribute('aria-expanded', 'false');
    emit('cb:build:close');
  }
  function toggleDock(){ IS_OPEN ? closeDock() : openDock(); }

  // ESC schließt das Dock
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') closeDock();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // [09] Initialisieren (einmalig)
  // ────────────────────────────────────────────────────────────────────────────
  async function initAndRender(){
    if (INIT_DONE) return;     // Debounce (z.B. assets-ready + registry-ready)
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
        $empty.innerHTML = `Fehler beim Laden des Baumenüs. Details in der Konsole.`;
        $empty.classList.remove('hidden');
        $empty.style.display = 'block';
      }
    }
  }

  // UI ankabeln (Button, Startzustand)
  function wireUI(){
    if ($btnBuild){
      $btnBuild.addEventListener('click', toggleDock);
      $btnBuild.setAttribute('aria-expanded', 'false');
    }
    // initial verstecken
    $dock.classList.add('hidden');
    $dock.style.display = 'none';
  }

  // ────────────────────────────────────────────────────────────────────────────
  // [10] Event-Wiring
  // ────────────────────────────────────────────────────────────────────────────
  window.addEventListener('cb:ui-ready',        wireUI,       { once:true });
  window.addEventListener('cb:assets-ready',    initAndRender, { once:true });
  window.addEventListener('cb:registry:ready',  initAndRender, { once:true });

  // Fallback: Standalone-Test ohne Events
  if (document.readyState !== 'loading') {
    wireUI();
    // initAndRender wird hier bewusst NICHT automatisch aufgerufen,
    // weil im „echten“ Spiel die Ready-Events die Reihenfolge bestimmen.
  } else {
    document.addEventListener('DOMContentLoaded', wireUI, { once:true });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // [11] Export – manuelle Steuerung/Debug
  // ────────────────────────────────────────────────────────────────────────────
  window.BuildUI = {
    open  : openDock,
    close : closeDock,
    toggle: toggleDock,
    filter: (catId) => { ACTIVE_CAT = catId || 'all'; renderCategories(); renderGrid(); },
    data  : () => ({ buildings: BUILDINGS.slice(), categories: CATEGORIES.slice(), active: ACTIVE_CAT })
  };
})();
