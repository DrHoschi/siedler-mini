/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.08-final+size
 * Modul    : Baumenü (Build-Dock)
 * Änderung : Größe (size / w,h) wird aus Daten übernommen und in data-w/h
 *            auf die Karten geschrieben, damit der Hook korrekte w/h kennt.
 * ========================================================================== */

(function EnsureDock(){
  const ok  = (m)=> (window.CBLog?.ok||console.log)('[build]', m);
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

  const LOG = (...m)=> (window.CBLog?.log  || console.log )('[build]', ...m);
  const INF = (...m)=> (window.CBLog?.info || console.info)('[build]', ...m);
  const WRN = (...m)=> (window.CBLog?.warn || console.warn)('[build]', ...m);
  const ERR = (...m)=> (window.CBLog?.error|| console.error)('[build]', ...m);

  const $dock = document.getElementById('build-dock');
  if (!$dock){ ERR('DOM: #build-dock fehlt'); return; }

  const getBtn = () => document.getElementById('btn-build');

  let BUILDINGS=[], CATEGORIES=[];
  let ACTIVE_CAT='all', IS_OPEN=false, INIT_DONE=false;

  const iconRes = id => `assets/icons/resources/${id}.png`;
  const iconBld = id => `assets/icons/buildings/${id}.png`;
  const emit = (name, detail={}) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const byCat = (list, cat) => (cat === 'all') ? list : list.filter(b => (b.categories||[]).includes(cat));

  function normalizeBuilding(raw){
    const id    = String(raw.id || '').trim();
    const name  = String(raw.name || id || 'Unbenannt');
    let cats    = Array.isArray(raw.categories) ? raw.categories.map(String)
                : raw.category ? [String(raw.category)] : ['misc'];
    const image = raw.image || iconBld(id);
    // ➜ Größe aus Daten mitnehmen (size:[w,h] ODER w/h):
    const w = Number(raw.w || (Array.isArray(raw.size) ? raw.size[0] : 1)) || 1;
    const h = Number(raw.h || (Array.isArray(raw.size) ? raw.size[1] : 1)) || 1;

    let cost = [];
    if (Array.isArray(raw.cost)) {
      cost = raw.cost.map(c => ({ id: String(c.id), amount: Number(c.amount||0) }))
                     .filter(c => c.id && c.amount > 0);
    } else if (raw.cost && typeof raw.cost === 'object') {
      cost = Object.keys(raw.cost).map(k => ({ id:String(k), amount:Number(raw.cost[k]||0) }))
                                  .filter(c => c.amount > 0);
    }
    return { id, name, categories: cats, image, cost, size:[w,h], w, h };
  }

  async function loadBuildings(){
    try {
      if (typeof window.Registry?.list === 'function') {
        let fromReg = window.Registry.list('building') || window.Registry.list('buildings');
        if (fromReg && fromReg.length){ BUILDINGS = fromReg.map(normalizeBuilding); INF('Datenquelle: Registry', BUILDINGS.length); return; }
      }
    } catch(e) { WRN('Registry.list("building") Fehler:', e); }
    try {
      const res  = await fetch('data/buildings.json', { cache:'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      const arr  = Array.isArray(json) ? json : (json?.buildings || []);
      BUILDINGS  = arr.map(normalizeBuilding);
      INF('Datenquelle: data/buildings.json', BUILDINGS.length);
    } catch(e) { ERR('Fallback-Laden fehlgeschlagen:', e); BUILDINGS = []; }
  }

  function buildCategories(){
    const map = new Map();
    BUILDINGS.forEach(b => (b.categories||[]).forEach(c => map.set(c, (map.get(c)||0)+1)));
    CATEGORIES = Array.from(map.entries()).map(([id,count])=>({id,name:id,count})).sort((a,b)=>a.id.localeCompare(b.id));
    CATEGORIES.unshift({ id:'all', name:'Alles', count: BUILDINGS.length });
    if (!CATEGORIES.some(c => c.id === ACTIVE_CAT)) ACTIVE_CAT = 'all';
  }

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
      </div>`;
    $dock.querySelector('#build-close')?.addEventListener('click', closeDock);
  }

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

  function renderGrid(){
    const $grid  = $dock.querySelector('#build-grid');
    const $empty = $dock.querySelector('#build-empty');
    if (!$grid) return;
    const list = byCat(BUILDINGS, ACTIVE_CAT);
    $grid.innerHTML = '';
    if (!list.length){ $empty?.classList.remove('hidden'); $empty && ($empty.style.display = 'block'); return; }
    $empty?.classList.add('hidden'); $empty && ($empty.style.display = '');

    list.forEach(b=>{
      const $card = document.createElement('button');
      $card.className = 'build-card';
      $card.setAttribute('data-building-id', b.id);
      // ➜ Größe auf die Karte schreiben (wichtig für den Hook!)
      $card.setAttribute('data-w', b.w||1);
      $card.setAttribute('data-h', b.h||1);

      $card.setAttribute('aria-label', `Gebäude ${b.name}`);

      const $title = document.createElement('div'); $title.className = 'build-card__title'; $title.textContent = b.name;
      const $img   = document.createElement('img'); $img.className = 'build-card__img'; $img.loading='lazy'; $img.alt=b.name; $img.src=b.image||iconBld(b.id);
      const $costs = document.createElement('div'); $costs.className='build-costs';
      (b.cost||[]).forEach(c=>{ const $c=document.createElement('div'); $c.className='build-cost';
        $c.innerHTML = `<img class="build-cost__icon" src="${iconRes(c.id)}" alt="${c.id}"><span class="build-cost__amt">x${c.amount}</span>`;
        $costs.appendChild($c);
      });

      $card.appendChild($title); $card.appendChild($img); $card.appendChild($costs);
      $grid.appendChild($card);
    });
  }

  function openDock(){
    if (IS_OPEN) return;
    IS_OPEN = true;
    $dock.hidden = false;
    $dock.classList.remove('hidden');
    $dock.style.display = 'block';
    const btn = getBtn(); if (btn) btn.setAttribute('aria-expanded', 'true');
    emit('cb:build:open');
    LOG('open');
  }
  function closeDock(){
    if (!IS_OPEN) return;
    IS_OPEN = false;
    $dock.classList.add('hidden');
    $dock.style.display = 'none';
    const btn = getBtn(); if (btn) btn.setAttribute('aria-expanded', 'false');
    emit('cb:build:close');
    LOG('close');
  }
  function toggleDock(){ IS_OPEN ? closeDock() : openDock(); }

  window.BuildDock = { show: openDock, hide: closeDock, toggle: toggleDock };

  window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeDock(); }, { passive:true });

  async function initAndRender(){
    if (INIT_DONE) return;
    INIT_DONE = true;
    try {
      $dock.hidden = false;
      $dock.classList.add('hidden');
      $dock.style.display = 'none';
      renderDockSkeleton();
      await loadBuildings();
      buildCategories();
      renderCategories();
      renderGrid();
      INF('bereit', { buildings: BUILDINGS.length, categories: CATEGORIES.length });
    } catch(e){
      ERR('initAndRender Fehler:', e);
      const $empty = $dock.querySelector('#build-empty');
      if ($empty){ $empty.textContent='Fehler beim Laden des Baumenüs. Details in der Konsole.'; $empty.classList.remove('hidden'); }
    }
  }

  function wireUI(){
    const btn = getBtn();
    if (!btn){ WRN('#btn-build fehlt – Dock nur per API steuerbar'); return; }
    if (btn.dataset.wiredBuild === '1') { INF('Button bereits verdrahtet – übersprungen'); return; }
    btn.dataset.wiredBuild = '1';
    btn.hidden = false;
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click', toggleDock);
    INF('Button verdrahtet (wireUI)');
  }

  window.addEventListener('cb:ui-ready',       wireUI,        { once:true });
  window.addEventListener('cb:assets-ready',   initAndRender, { once:true });
  window.addEventListener('cb:registry:ready', initAndRender, { once:true });
  window.addEventListener('cb:game:start',     initAndRender, { once:true });

  window.addEventListener('cb:build:open',  openDock);
  window.addEventListener('cb:build:close', closeDock);

  LOG('ui-build geladen (v25.11.08-final+size)');
})();
