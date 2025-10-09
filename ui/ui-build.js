/* ============================================================================
 * Datei     : ui/ui-build.js
 * Projekt   : Neue Siedler
 * Version   : v24.4.0 (2025-10-08)
 * Modul     : Baumenü – Kategorien, Karten, Öffnen/Schließen
 * ----------------------------------------------------------------------------
 * Was macht's?
 *  - Lädt Gebäudekatalog (Registry → 'buildings' ODER data/buildings.json Fallback)
 *  - Rendert Kategorien (mit Icons unter assets/icons/build/<cat>.png)
 *  - Rendert Kartenraster (Titel, Holzrahmen, Illustration, Kosten)
 *  - Öffnen/Schließen per #btn-build  (wird bei Bedarf erzeugt)
 *  - Events:
 *      emit: 'req:place:start' { building }   → Platziermodus starten
 * ========================================================================= */
// -- Sichere Logger ----------------------------------------------------------
const __safeLog = {
  ok   : (tag, ...m) => {
    try {
      if (typeof window?.CBLog?.ok === 'function') { window.CBLog.ok([tag, ...m]); }
      else { console.log(tag, ...m); }
    } catch { try { console.log(tag, ...m); } catch (_){} }
  },
  info : (tag, ...m) => {
    try {
      if (typeof window?.CBLog?.info === 'function') { window.CBLog.info([tag, ...m]); }
      else { console.info(tag, ...m); }
    } catch { try { console.info(tag, ...m); } catch (_){} }
  },
  warn : (tag, ...m) => {
    try {
      if (typeof window?.CBLog?.warn === 'function') { window.CBLog.warn([tag, ...m]); }
      else { console.warn(tag, ...m); }
    } catch { try { console.warn(tag, ...m); } catch (_){} }
  }
};
const LOG = (...m)=>__safeLog.ok('[build]', ...m);
const INF = (...m)=>__safeLog.info('[build]', ...m);
const WRN = (...m)=>__safeLog.warn('[build]', ...m);

(function(){
  'use strict';

  /* ------------------------------------------------------------------------ */
  /* 0) Utils / DOM                                                           */
  /* ------------------------------------------------------------------------ */
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const log = (...a)=>(window.CBLog?.ok||console.log)('[build]',...a);

  // Dock-Root (erzeugen, falls nicht vorhanden)
  let $dock = $('#build-dock');
  if (!$dock){
    $dock = document.createElement('div');
    $dock.id = 'build-dock';
    $dock.className = 'hidden';
    document.body.appendChild($dock);
  }

  // Öffner-Button (nutze vorhandenen #btn-build, sonst erzeugen)
  let $btn = $('#btn-build');
  if (!$btn){
    $btn = document.createElement('button');
    $btn.id = 'btn-build';
    $btn.type = 'button';
    $btn.setAttribute('aria-expanded','false');
    $btn.textContent = 'Bauen';
    document.body.appendChild($btn);
  }

  // Kategorien-Icons: erwartet assets/icons/build/<catId>.png
  const catIcon = (id)=> `assets/icons/build/${id}.png`;

  // Panel-Bild wird via CSS (var(--panel-url)) gerendert.
  // Illustration pro Karte kommt vom Gebäude (b.<image>)

  /* ------------------------------------------------------------------------ */
  /* 1) Datenquelle – Registry oder Fallback JSON                             */
  /* ------------------------------------------------------------------------ */
  async function loadBuildings(){
    // Registry-Pfad
    if (window.Registry?.list){
      const list = Registry.list('buildings') || [];
      if (list.length) return list;
    }
    // Fallback JSON
    try{
      const res = await fetch('data/buildings.json', { cache:'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    }catch(e){
      console.warn('[build] Fallback data/buildings.json fehlgeschlagen:', e);
      return [];
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 2) State                                                                 */
  /* ------------------------------------------------------------------------ */
  let BUILDINGS = [];
  let FILTER = 'all'; // aktive Kategorie

  /* ------------------------------------------------------------------------ */
  /* 3) Render: Dock Grundstruktur                                            */
  /* ------------------------------------------------------------------------ */
  function renderDockSkeleton(){
    $dock.innerHTML = `
      <div class="build-head">
        <div class="build-head-left">
          <strong>Baumenü – Epoche 1</strong>
        </div>
        <div class="build-head-right">
          <span id="build-count"></span>
          <button class="build-close" type="button" aria-label="Schließen">×</button>
        </div>
      </div>

      <div class="build-cats" id="build-cats"></div>

      <div class="build-grid" id="build-grid"></div>
    `;

    // Schließen
    $('.build-close', $dock)?.addEventListener('click', closeDock);
  }

  /* ------------------------------------------------------------------------ */
  /* 4) Kategorien berechnen + rendern                                        */
  /* ------------------------------------------------------------------------ */
  function collectCategories(items){
    const map = new Map(); // id -> { id, name, count }
    // Immer „all“
    map.set('all', { id:'all', name:'Alles', count: items.length });
    for (const b of items){
      const cats = Array.isArray(b.categories) ? b.categories : (b.category ? [b.category] : []);
      for (const c of cats){
        const id = String(c).trim() || 'misc';
        if (!map.has(id)) map.set(id, { id, name: id, count: 0 });
        map.get(id).count++;
      }
    }
    return Array.from(map.values());
  }

  function renderCategories(items){
    const cats = collectCategories(items);
    const $wrap = $('#build-cats', $dock);
    $wrap.innerHTML = '';

    cats.forEach(cat=>{
      const btn = document.createElement('button');
      btn.className = 'chip' + (cat.id === FILTER ? ' chip--active' : '');
      btn.dataset.cat = cat.id;

      // Icon + Label + Count
      const icon = document.createElement('img');
      icon.className = 'chip-icon';
      icon.alt = cat.name;
      icon.src = cat.id === 'all' ? catIcon('all') : catIcon(cat.id);

      const label = document.createElement('span');
      label.textContent = cat.name;

      const cnt = document.createElement('span');
      cnt.className = 'chip-count';
      cnt.textContent = String(cat.count);

      btn.appendChild(icon);
      btn.appendChild(label);
      btn.appendChild(cnt);

      btn.addEventListener('click', ()=>{
        FILTER = cat.id;
        $$('.chip', $wrap).forEach(x=>x.classList.toggle('chip--active', x===btn));
        renderGrid(); // neu filtern
      });

      $wrap.appendChild(btn);
    });

    // Kopf-Count
    $('#build-count', $dock).textContent = `${items.length} Gebäude`;
  }

  /* ------------------------------------------------------------------------ */
  /* 5) Grid/Karten rendern                                                   */
  /* ------------------------------------------------------------------------ */
  function filtered(){
    if (FILTER === 'all') return BUILDINGS;
    return BUILDINGS.filter(b=>{
      const cats = Array.isArray(b.categories) ? b.categories : (b.category ? [b.category] : []);
      return cats.map(String).map(s=>s.trim()).includes(FILTER);
    });
  }

  function renderGrid(){
    const items = filtered();
    const $grid = $('#build-grid', $dock);
    $grid.innerHTML = '';

    items.forEach(b=>{
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'build-card';
      card.title = b.name || b.id;

      // Panel (Holzrahmen per CSS, aber wir fügen <div.card-panel> hinzu
      const panel = document.createElement('div');
      panel.className = 'card-panel';

      // Titel
      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = b.name || b.id;

      // Body mit Illustration
      const body = document.createElement('div');
      body.className = 'card-body';
      const illu = document.createElement('img');
      illu.className = 'card-illu';
      illu.alt = b.name || b.id;
      illu.src = b.image || `assets/icons/buildings/b.${b.id}.png`; // dein bisheriges Pattern
      body.appendChild(illu);

      // Kostenleiste
      const costs = document.createElement('div');
      costs.className = 'card-costs';
      const ks = Array.isArray(b.cost) ? b.cost : [];
      ks.forEach(k=>{
        const badge = document.createElement('span');
        badge.className = 'cost';
        const icon = document.createElement('img');
        icon.src = `assets/icons/resources/${k.id}.png`;
        icon.alt = k.id;
        const amount = document.createElement('b');
        amount.textContent = 'x'+(k.amount||k.qty||1);
        badge.appendChild(icon);
        badge.appendChild(amount);
        costs.appendChild(badge);
      });

      card.append(panel, title, body, costs);

      // Klick → Platziermodus starten
      card.addEventListener('click', ()=>{
        window.dispatchEvent(new CustomEvent('req:place:start', { detail:{ building: b }}));
        closeDock();
      });

      $grid.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------------ */
  /* 6) Öffnen/Schließen                                                      */
  /* ------------------------------------------------------------------------ */
  function openDock(){
    $dock.classList.remove('hidden');
    $btn.setAttribute('aria-expanded','true');
  }
  function closeDock(){
    $dock.classList.add('hidden');
    $btn.setAttribute('aria-expanded','false');
  }
  $btn.addEventListener('click', ()=>{
    const isOpen = !$dock.classList.contains('hidden');
    if (isOpen) closeDock(); else openDock();
  });

  /* ------------------------------------------------------------------------ */
  /* 7) Init                                                                  */
  /* ------------------------------------------------------------------------ */
  async function init(){
    renderDockSkeleton();
    BUILDINGS = await loadBuildings();
    renderCategories(BUILDINGS);
    renderGrid();
    log('bereit: buildings=', BUILDINGS.length);
  }

  // Starte, wenn UI ready – oder sofort
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  }else{
    init();
  }

})();
