/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v24.4.0 (2025-10-07)
 * Modul    : Baumenü (Dock unten) + Kategorien + Kartenraster
 *
 * Kurzbeschreibung
 *   - Öffnet ein Dock am unteren Bildschirmrand (Button #btn-build).
 *   - Lädt Gebäudedaten (Registry → Fallback data/buildings.json).
 *   - Zeigt Kategorien (mit Anzahl) und darunter Karten (gleiches Grid).
 *   - Jede Karte: Panel-Hintergrund (per CSS), Name, Vorschau-Bild (optional),
 *                 Kosten (Icon + Menge) unten rechts.
 *   - Klick auf Karte: „req:place:begin“ mit selektiertem Building wird gefeuert.
 *
 * Events (listen)
 *   - cb:registry:ready         → Daten aus Registry ziehen
 *   - cb:assets-ready           → Fallback-Lader darf starten
 *   - cb:ui-ready               → UI ankabeln (Button, Dock)
 *
 * Events (emit)
 *   - cb:build:open / cb:build:close
 *   - req:place:begin { building }
 *
 * Abhängigkeiten (Assets / Pfade)
 *   - Gebäudeicons (optional):  assets/icons/buildings/<id>.png
 *   - Ressourcenicons:          assets/icons/resources/<id>.png
 *   - Fallback JSON:            data/buildings.json
 *
 * DOM-Kontrakt (IDs/Klassen)
 *   - #build-dock   : Dock-Container (wird befüllt)
 *   - #btn-build    : Toggle-Button unten links (Öffnen/Schließen)
 *   - CSS-Klassen   : .build-dock, .build-dock__head, .build-dock__body,
 *                     .build-cats, .build-cat, .is-active,
 *                     .build-grid, .build-card, .build-card__title,
 *                     .build-card__img, .build-costs, .build-cost
 *
 * Changelog v24.4.0
 *   [01] Robuste Logger-Wrapper (kein args.map Crash).
 *   [02] Vollständiger Fallback-Lader, defensive Normalisierung von Gebäuden.
 *   [03] Kategorien-Bar mit Zählern; Auswahlfilterung stabilisiert.
 *   [04] Kartenraster an CSS-Grid (mehrere Spalten, responsive).
 *   [05] Saubere Toggle-Logik; Close-Button im Dock-Kopf.
 *   [06] Komplette Kommentierung & Fehlerhinweise im UI (leere States).
 * ========================================================================== */
(function(){
  const MOD = 'build';
  const err = (m)=> (window.CBLog?.error||console.error)(`[${MOD}] ${m}`);
  const ok  = (m)=> (window.CBLog?.ok||console.log)(`[${MOD}] ${m}`);

  // Wenn #build-dock fehlt, Container selbst anlegen (Failsafe)
  function ensureDock(){
    let el = document.getElementById('build-dock');
    if (!el){
      el = document.createElement('div');
      el.id = 'build-dock';
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
      `;
      document.body.appendChild(el);
      ok('Failsafe: #build-dock erzeugt.');
    }
    return el;
  }

  ensureDock();  // <-- Früh ausführen, bevor init()
  // … danach dein bisheriger Code …
})();

(() => {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────────
  // [00] Sichere Logger (verhindert "args.map is not a function")
  // ────────────────────────────────────────────────────────────────────────────
  const __safeLog = (fn, tag, ...m) => {
    try {
      const CB = window.CBLog && typeof window.CBLog[fn] === 'function';
      if (CB) window.CBLog[fn]([tag, ...m]);
      else (console[fn] || console.log)(tag, ...m);
    } catch {
      try { (console[fn] || console.log)(tag, ...m); } catch(_) {}
    }
  };
  const LOG = (...m)=>__safeLog('log',  '[build]', ...m);
  const INF = (...m)=>__safeLog('info', '[build]', ...m);
  const WRN = (...m)=>__safeLog('warn', '[build]', ...m);
  const ERR = (...m)=>__safeLog('error','[build]', ...m);

  // ────────────────────────────────────────────────────────────────────────────
  // [01] DOM-Hooks
  // ────────────────────────────────────────────────────────────────────────────
  const $dock     = document.getElementById('build-dock'); // Dock-Container
  const $btnBuild = document.getElementById('btn-build');  // Toggle-Button

  if (!$dock)  { ERR('DOM: #build-dock fehlt');  return; }
  if (!$btnBuild){ WRN('DOM: #btn-build fehlt – Dock nur per API steuerbar'); }

  // ────────────────────────────────────────────────────────────────────────────
  // [02] State
  // ────────────────────────────────────────────────────────────────────────────
  let BUILDINGS = [];           // normalisierte Gebäudeliste
  let CATEGORIES = [];          // {id, name, count}
  let ACTIVE_CAT = 'all';       // aktuell gefilterte Kategorie
  let IS_OPEN = false;

  // ────────────────────────────────────────────────────────────────────────────
  // [03] Utilities
  // ────────────────────────────────────────────────────────────────────────────
  const iconRes  = id => `assets/icons/resources/${id}.png`;
  const iconBld  = id => `assets/icons/buildings/${id}.png`;

  const emit = (name, detail={}) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  function byCat(list, cat){
    if (cat === 'all') return list;
    return list.filter(b => (b.categories || []).includes(cat));
  }

  // Eine sehr defensive Normalisierung – toleriert alte/teils fehlende Felder.
  function normalizeBuilding(raw){
    const id    = String(raw.id || '').trim();
    const name  = String(raw.name || id || 'Unbenannt');
    // Kategorien: string | string[] → string[]
    let cats = [];
    if (Array.isArray(raw.categories)) cats = raw.categories.map(String);
    else if (raw.category) cats = [String(raw.category)];
    else cats = ['misc'];

    // Bild (optional) – nutze Standardpfad wenn nicht gesetzt.
    const image = raw.image || iconBld(id);

    // Kosten in Form [{id, amount}] normalisieren:
    let cost = [];
    if (Array.isArray(raw.cost)) {
      cost = raw.cost.map(c => ({ id: String(c.id), amount: Number(c.amount||0) }))
                     .filter(c => c.id && c.amount > 0);
    } else if (raw.cost && typeof raw.cost === 'object') {
      // auch {wood:2, stone:1} erlauben:
      cost = Object.keys(raw.cost).map(k => ({ id:String(k), amount: Number(raw.cost[k]||0) }))
                                  .filter(c => c.amount > 0);
    }

    return { id, name, categories: cats, image, cost };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // [04] Daten laden: Registry → Fallback JSON
  // ────────────────────────────────────────────────────────────────────────────
  async function loadBuildings(){
    // 4.1 Registry
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

  // Kategorien auf Basis der geladenen Daten aufbauen
  function buildCategories(){
    const map = new Map();
    BUILDINGS.forEach(b => (b.categories||[]).forEach(c => {
      map.set(c, (map.get(c)||0)+1);
    }));
    CATEGORIES = Array.from(map.entries())
      .map(([id, count]) => ({ id, name: id, count }))
      .sort((a,b)=> a.id.localeCompare(b.id));

    // „Alles“ virtuell vorn anstellen
    const total = BUILDINGS.length;
    CATEGORIES.unshift({ id:'all', name:'Alles', count: total });
    if (!CATEGORIES.some(c => c.id === ACTIVE_CAT)) ACTIVE_CAT = 'all';
  }

  // ────────────────────────────────────────────────────────────────────────────
  // [05] Render – statischer Rahmen des Docks
  // ────────────────────────────────────────────────────────────────────────────
  function renderDockSkeleton(){
    $dock.innerHTML = `
      <div class="build-dock__head">
        <div class="build-dock__title">
          <span>Baumenü – Epoche 1</span>
          <span class="build-dock__count" id="build-count">0 Gebäude</span>
        </div>
        <button class="build-dock__close" id="build-close" aria-label="Schließen">×</button>
      </div>

      <div class="build-dock__body">
        <div class="build-cats" id="build-cats"></div>
        <div class="build-grid" id="build-grid"></div>
        <div class="build-empty hidden" id="build-empty">
          Keine Gebäude gefunden. Prüfe <code>data/buildings.json</code> oder die Registry-Kategorien.
        </div>
      </div>
    `;

    // Close-Button
    const $close = $dock.querySelector('#build-close');
    $close?.addEventListener('click', closeDock);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // [06] Render – Kategorienleiste
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
      btn.addEventListener('click', () => {
        ACTIVE_CAT = cat.id;
        renderCategories();  // active marker neu setzen
        renderGrid();        // grid filtern
      });
      $cats.appendChild(btn);
    });

    $count.textContent = `${BUILDINGS.length} Gebäude`;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // [07] Render – Grid (Karten)
  // ────────────────────────────────────────────────────────────────────────────
  function renderGrid(){
    const $grid  = $dock.querySelector('#build-grid');
    const $empty = $dock.querySelector('#build-empty');
    if (!$grid) return;

    const list = byCat(BUILDINGS, ACTIVE_CAT);
    $grid.innerHTML = '';

    if (!list.length){
      $empty?.classList.remove('hidden');
      return;
    }
    $empty?.classList.add('hidden');

    list.forEach(b=>{
      const $card = document.createElement('button');
      $card.className = 'build-card';
      $card.setAttribute('data-bid', b.id);
      $card.setAttribute('aria-label', `Gebäude ${b.name}`);

      // Titel
      const $title = document.createElement('div');
      $title.className = 'build-card__title';
      $title.textContent = b.name;
      $card.appendChild($title);

      // Bild
      const $img = document.createElement('img');
      $img.className = 'build-card__img';
      $img.loading = 'lazy';
      $img.alt = b.name;
      $img.src = b.image || iconBld(b.id);  // Panel liegt in CSS, das hier ist die Vorschau
      $card.appendChild($img);

      // Kosten
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
      $card.appendChild($costs);

      // Klick → Platzieren anfordern
      $card.addEventListener('click', () => {
        INF('select', b.id);
        emit('req:place:begin', { building: b });
      });

      $grid.appendChild($card);
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // [08] Öffnen / Schließen
  // ────────────────────────────────────────────────────────────────────────────
  function openDock(){
    if (IS_OPEN) return;
    IS_OPEN = true;
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

  // ────────────────────────────────────────────────────────────────────────────
  // [09] Bootsequence (UI ankabeln, Daten laden, rendern)
  // ────────────────────────────────────────────────────────────────────────────
  async function initAndRender(){
    try {
      renderDockSkeleton();
      await loadBuildings();
      buildCategories();
      renderCategories();
      renderGrid();
      INF('bereit', { buildings: BUILDINGS.length, categories: CATEGORIES.length });
    } catch(e){
      ERR('initAndRender Fehler:', e);
      // UI-Fehlerhinweis
      const $empty = $dock.querySelector('#build-empty');
      if ($empty){
        $empty.innerHTML = `Fehler beim Laden des Baumenüs. Details in der Konsole.`;
        $empty.classList.remove('hidden');
      }
    }
  }

  // UI ankabeln
  function wireUI(){
    if ($btnBuild){
      $btnBuild.addEventListener('click', toggleDock);
      // Beim Start zu – öffnet nur auf Button. (Zum Testen: openDock();)
      $btnBuild.setAttribute('aria-expanded', 'false');
    }
    // Dock initial verstecken (CSS sollte .hidden definieren)
    $dock.classList.add('hidden');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // [10] Event-Wiring
  // ────────────────────────────────────────────────────────────────────────────
  window.addEventListener('cb:ui-ready',        wireUI);
  window.addEventListener('cb:assets-ready',    initAndRender);
  window.addEventListener('cb:registry:ready',  initAndRender);

  // Fallback: wenn niemand Events feuert (z. B. Standalone-Test)
  document.readyState !== 'loading'
    ? (wireUI(), initAndRender())
    : document.addEventListener('DOMContentLoaded', () => { wireUI(); initAndRender(); });

  // ────────────────────────────────────────────────────────────────────────────
  // [11] Export für Debug/Manuelle Steuerung
  // ────────────────────────────────────────────────────────────────────────────
  window.BuildUI = {
    open : openDock,
    close: closeDock,
    toggle: toggleDock,
    filter: (catId) => { ACTIVE_CAT = catId || 'all'; renderCategories(); renderGrid(); },
    data: () => ({ buildings: BUILDINGS.slice(), categories: CATEGORIES.slice(), active: ACTIVE_CAT })
  };
})();
