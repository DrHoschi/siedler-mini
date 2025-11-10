/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.10-final
 * Zweck    : Baumenü (Build-Dock) – Auswahl setzt Build-Tool und startet Place (3×3)
 * Hinweis  : Datenquelle primär Registry.list('building'), Fallback data/buildings.json
 * ========================================================================== */
(() => {
  'use strict';

  const TAG = '[build]';
  const LOG = (...a)=>(window.CBLog?.info ?? console.info)(TAG, ...a);
  const ERR = (...a)=>(window.CBLog?.error?? console.error)(TAG, ...a);

  const $dock = document.getElementById('build-dock') || (()=> {
    const el = document.createElement('div');
    el.id = 'build-dock'; el.hidden = true; el.style.overflow='auto';
    document.body.appendChild(el);
    return el;
  })();

  let BUILDINGS = [];
  let INIT = false;

  const emit = (name, detail={}) => window.dispatchEvent(new CustomEvent(name, { detail }));

  function normalize(b){
    // Sicherstellen, dass w/h gesetzt sind (Default 3×3)
    const w = Number(b?.w || (Array.isArray(b?.size)?b.size[0]:0)) || 3;
    const h = Number(b?.h || (Array.isArray(b?.size)?b.size[1]:0)) || 3;
    return { ...b, w, h, size:[w,h] };
  }

  async function loadBuildings(){
    try {
      if (window.Registry?.list){
        const list = window.Registry.list('building');
        if (list?.length){
          BUILDINGS = list.map(normalize);
          return;
        }
      }
    } catch {}
    // Fallback
    try {
      const r = await fetch('data/buildings.json', { cache:'no-store' });
      const json = await r.json();
      const arr  = Array.isArray(json)? json : (json?.buildings||[]);
      BUILDINGS  = arr.map(normalize);
    } catch(e){ ERR('Laden fehlgeschlagen:', e); BUILDINGS = []; }
  }

  function render(){
    $dock.innerHTML = `
      <div class="build-dock__head">
        <div class="build-dock__title"><span>Baumenü</span>
          <span class="build-dock__count" id="build-count">${BUILDINGS.length} Gebäude</span>
        </div>
        <button class="build-dock__close" id="build-close" aria-label="Schließen">×</button>
      </div>
      <div class="build-dock__body">
        <div class="build-grid" id="build-grid"></div>
      </div>
    `;
    $dock.querySelector('#build-close')?.addEventListener('click', closeDock);

    const $grid = $dock.querySelector('#build-grid');
    BUILDINGS.forEach(b=>{
      const btn = document.createElement('button');
      btn.className = 'build-card';
      btn.setAttribute('data-building', b.id);
      btn.setAttribute('data-w', b.w || 3);
      btn.setAttribute('data-h', b.h || 3);
      btn.innerHTML = `
        <div class="build-card__title">${b.name || b.id}</div>
        <img class="build-card__img" loading="lazy" alt="${b.name||b.id}" src="${b.image||''}">
      `;
      btn.addEventListener('click', ()=>{
        // Tool setzen (für Cursor/Styles)
        emit('cb:set-build-tool', { kind:b.id });
        // Platzieren starten – Standard 3×3 (oder Button-Daten)
        const w = Number(btn.getAttribute('data-w'))||3;
        const h = Number(btn.getAttribute('data-h'))||3;
        emit('req:place:begin', { w, h });
        LOG('select', b.id, `→ begin ${w}x${h}`);
      });
      $grid.appendChild(btn);
    });
  }

  function openDock(){ $dock.hidden=false; $dock.style.display='block'; emit('cb:build:open'); LOG('open'); }
  function closeDock(){ $dock.style.display='none'; $dock.hidden=true; emit('cb:build:close'); LOG('close'); }

  async function init(){
    if (INIT) return; INIT = true;
    await loadBuildings();
    render();
    LOG('bereit', { buildings: BUILDINGS.length });
  }

  // Lifecycle (Registry/Assets/Game)
  window.addEventListener('cb:registry:ready', init, { once:true });
  window.addEventListener('cb:game:start',     init, { once:true });
  window.addEventListener('cb:assets-ready',   init, { once:true });

  // Externe Steuerung (z. B. HUD-Button)
  window.BuildDock = { show: openDock, hide: closeDock, toggle: ()=>($dock.hidden?openDock():closeDock()) };
})();
