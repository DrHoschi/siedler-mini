/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.10.27-build2
 * Modul    : Baumenü (Build-Dock) – Kategorien + Kartenraster + Kosten-Preflight
 * ============================================================================
 * Lauscht  :
 *   cb:ui-ready, cb:assets-ready, cb:registry:ready, cb:game:start
 *   req:buildmenu:show              (Legacy-Open)
 *   req:build:open / req:build:close / req:build:toggle
 *   cb:build:open / cb:build:close  (für Fremdsteuerung idempotent)
 *
 *   [Legacy-Bridge]
 *   req:place:begin  → wir leiten auf req:place:start {buildingId} um
 *
 * Sendet   :
 *   cb:build:open / cb:build:close
 *   req:build:start { id, cost }                       // moderne Engine-API (Platzierungsmodus)
 *   req:place:start { buildingId }                     // Legacy für Engine/Map
 *   cb:set-build-tool { type }                         // Legacy für core.input.js
 *   cb:build:denied { id, reason:'insufficient_resources', need:{}, have:{} }
 *
 * DOM      : #build-dock (Container), #btn-build (Toggle)
 * Hinweise : - Registry-First, Fallback: data/buildings.json
 *            - Kostenprüfung gegen RegistryValues / Registry.data.resources (Map)
 *            - Doppel-Init verhindert (INIT_DONE)
 *            - UI-Hinweis bei fehlenden Ressourcen
 * ============================================================================ */

/* --- Failsafe: #build-dock sicherstellen (greift nur, wenn nicht vorhanden) --- */
(function FailsafeEnsureDock(){
  const MOD = 'build';
  const ok  = (m)=> (window.CBLog?.ok||console.log)(`[${MOD}] ${m}`);
  let el = document.getElementById('build-dock');
  if (!el){
    el = document.createElement('div');
    el.id = 'build-dock';
    el.className = 'hidden';
    el.style.overflow = 'auto';
    el.style.pointerEvents = 'auto';
    el.style.zIndex = 60;
    document.body.appendChild(el);
    ok('Failsafe: #build-dock erzeugt.');
  }
})();

/* --- Hauptmodul ------------------------------------------------------------- */
(function(){
  'use strict';

  /* =============================== [LOGGING] =============================== */
  const __safeLog = (fn, tag, ...m)=>{ try{ (window.CBLog?.[fn]||console[fn]||console.log)(tag, ...m); }catch{} };
  const LOG = (...m)=>__safeLog('log',  '[build]', ...m);
  const INF = (...m)=>__safeLog('info', '[build]', ...m);
  const WRN = (...m)=>__safeLog('warn', '[build]', ...m);
  const ERR = (...m)=>__safeLog('error','[build]', ...m);

  /* ================================ [DOM] ================================= */
  const $dock     = document.getElementById('build-dock');
  const $btnBuild = document.getElementById('btn-build');
  if (!$dock){ ERR('DOM: #build-dock fehlt'); return; }

  /* ================================= [STATE] =============================== */
  let BUILDINGS=[], CATEGORIES=[], ACTIVE_CAT='all', IS_OPEN=false, INIT_DONE=false;

  /* ================================ [UTIL] ================================= */
  const iconRes=id=>`assets/icons/resources/${id}.png`;
  const iconBld=id=>`assets/icons/buildings/${id}.png`;
  const emit=(n,d={})=>window.dispatchEvent(new CustomEvent(n,{detail:d}));
  const byCat=(arr,cat)=>cat==='all'?arr:arr.filter(b=>(b.categories||[]).includes(cat));
  const toInt = v => Number(v||0);

  /** Ressourcen-Map bereitstellen (RegistryValues oder Registry.data.resources) */
  function getResourceMap(){
    const R = window.Registry || {};
    const V = window.RegistryValues || R.resources || R.data?.resources || {};
    return V && typeof V==='object' ? V : {};
  }

  /** Prüft, ob Kosten bezahlt werden können, liefert { ok, need, have } */
  function canAfford(costArr){
    const have = getResourceMap();
    const need = {};
    let ok = true;
    for (const c of (costArr||[])){
      const id = String(c.id);
      const amt = toInt(c.amount);
      if (!id || amt<=0) continue;
      need[id] = (need[id]||0) + amt;
      if (toInt(have[id]) < amt) ok=false;
    }
    return { ok, need, have };
  }

  /** Kosten in Array-Form normalisieren */
  function normalizeCost(raw){
    if (!raw) return [];
    if (Array.isArray(raw)) return raw
      .map(c=>({id:String(c.id), amount:toInt(c.amount)}))
      .filter(c=>c.id && c.amount>0);
    if (typeof raw==='object') return Object.keys(raw)
      .map(k=>({id:k, amount:toInt(raw[k])}))
      .filter(c=>c.amount>0);
    return [];
  }

  /** Building-Eintrag normalisieren → {id,name,categories[],image,cost[]} */
  function normalizeBuilding(raw){
    const id=String(raw.id||'').trim();
    const name=raw.name||raw.title||id||'Unbenannt';
    const cats=Array.isArray(raw.categories)?raw.categories
                : (raw.category?[raw.category]: (raw.cat?[raw.cat]:['misc']));
    const image=raw.image||raw.icon||iconBld(id);
    const cost = normalizeCost(raw.cost || raw.price || raw.requirements?.cost || raw.resources);
    return {id,name,categories:cats,image,cost};
  }

  /* ============================== [DATENQUELLE] ============================ */
  async function loadFromRegistry(){
    try{
      const R = window.Registry || {};
      let list = null;
      if (typeof R.list === 'function') list = R.list('buildings');
      else if (Array.isArray(R.data?.buildings)) list = R.data.buildings;
      if (!Array.isArray(list) || !list.length) return false;
      BUILDINGS = list.map(normalizeBuilding);
      const cats = (R.categories?.() || R.data?.categories || []).slice();
      buildCategoriesFrom(cats.length ? cats : null);
      INF('Datenquelle: registry', BUILDINGS.length);
      return true;
    }catch(e){ WRN('Registry-Quelle nicht nutzbar', e?.message||e); return false; }
  }

  async function loadFromJSON(){
    try{
      const res=await fetch('data/buildings.json',{cache:'no-store'});
      const json=await res.json();
      const arr=Array.isArray(json)?json:(json?.buildings||[]);
      BUILDINGS=arr.map(normalizeBuilding);
      buildCategoriesFrom(json?.categories || null);
      INF('Datenquelle: data/buildings.json', BUILDINGS.length);
    }catch(e){ERR('Buildings laden fehlgeschlagen',e);BUILDINGS=[]; buildCategoriesFrom(null);}
  }

  function buildCategoriesFrom(prefList){
    const map=new Map();
    BUILDINGS.forEach(b=>(b.categories||[]).forEach(c=>map.set(c,(map.get(c)||0)+1)));
    CATEGORIES=Array.from(map.entries()).map(([id,count])=>({id,name:id,count}))
      .sort((a,b)=>a.id.localeCompare(b.id));
    if (Array.isArray(prefList) && prefList.length){
      // Sortierung an Registry-Meta anlehnen (falls vorhanden)
      CATEGORIES.sort((a,b)=> (prefList.indexOf(a.id) - prefList.indexOf(b.id)));
    }
    CATEGORIES.unshift({id:'all',name:'Alles',count:BUILDINGS.length});
    if(!CATEGORIES.some(c=>c.id===ACTIVE_CAT))ACTIVE_CAT='all';
  }

  /* =========================== [RENDER-STRUKTUR] =========================== */
  function renderDockSkeleton(){
    $dock.innerHTML=`
      <div class="build-dock__head">
        <div class="build-dock__title">
          <span>Baumenü</span>
          <span id="build-count" class="build-dock__count"></span>
        </div>
        <button id="build-close" class="build-dock__close" aria-label="Schließen">×</button>
      </div>
      <div class="build-dock__body">
        <div id="build-msg" class="build-msg hidden"></div>
        <div id="build-cats" class="build-cats"></div>
        <div id="build-grid" class="build-grid"></div>
        <div id="build-empty" class="build-empty hidden">Keine Gebäude gefunden.</div>
      </div>`;
    $dock.querySelector('#build-close')?.addEventListener('click',closeDock);
  }

  /* ================================ [CATS] ================================= */
  function renderCategories(){
    const $cats=$dock.querySelector('#build-cats'),$cnt=$dock.querySelector('#build-count');
    $cats.innerHTML='';
    CATEGORIES.forEach(cat=>{
      const b=document.createElement('button');
      b.className='build-cat'+(cat.id===ACTIVE_CAT?' is-active':'');
      b.innerHTML=`<span>${cat.name}</span><small>${cat.count}</small>`;
      b.onclick=()=>{ACTIVE_CAT=cat.id;renderCategories();renderGrid();};
      $cats.appendChild(b);
    });
    if($cnt)$cnt.textContent=`${BUILDINGS.length} Gebäude`;
  }

  /* ================================ [GRID] ================================= */
  function renderGrid(){
    const $grid=$dock.querySelector('#build-grid'),$empty=$dock.querySelector('#build-empty');
    const list=byCat(BUILDINGS,ACTIVE_CAT);
    $grid.innerHTML='';
    if(!list.length){$empty?.classList.remove('hidden');return;}
    $empty?.classList.add('hidden');

    list.forEach(b=>{
      const card=document.createElement('button');
      card.className='build-card';
      card.innerHTML=`
        <div class="build-card__title">${b.name}</div>
        <img class="build-card__img" src="${b.image}" alt="${b.name}">
        <div class="build-costs">
          ${(b.cost||[]).map(c=>`
            <div class="build-cost" title="${c.id} × ${c.amount}">
              <img src="${iconRes(c.id)}" alt="${c.id}" class="build-cost__icon">
              <span>x${c.amount}</span>
            </div>`).join('')}
        </div>`;
      card.onclick=()=>onSelectBuilding(b);
      $grid.appendChild(card);
    });
  }

  /* ============================ [INTERAKTION] ============================== */
  function showMsg(text, kind='warn'){
    const box=$dock.querySelector('#build-msg'); if(!box) return;
    box.textContent=text||''; box.className=''; box.classList.add('build-msg', `is-${kind}`);
    if (!text){ box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    // Auto-hide nach 2.5s
    clearTimeout(showMsg._t);
    showMsg._t = setTimeout(()=> box.classList.add('hidden'), 2500);
  }

  function onSelectBuilding(b){
    // 1) Kosten prüfen
    const { ok, need, have } = canAfford(b.cost);
    if (!ok){
      emit('cb:build:denied', { id:b.id, reason:'insufficient_resources', need, have });
      showMsg('Nicht genug Ressourcen!', 'warn');
      return;
    }

    // 2) Events an Engine schicken (neu & legacy)
    emit('req:build:start', { id:b.id, cost:b.cost });              // neue API: Engine startet Platzierungsmodus
    emit('req:place:start', { buildingId: b.id });                  // legacy für Map/Engine
    emit('cb:set-build-tool', { type: b.id });                      // legacy für core.input.js

    INF('select', b.id);
    // (Optional: Dock schließen, wenn du das willst – hier offen lassen)
    // closeDock();
  }

  /* ============================ [OPEN/CLOSE] =============================== */
  function openDock(){
    if(IS_OPEN) return; IS_OPEN=true;
    $dock.hidden=false; $dock.classList.remove('hidden');
    emit('cb:build:open'); INF('geöffnet');
    showMsg('', 'info');
  }
  function closeDock(){
    if(!IS_OPEN) return; IS_OPEN=false;
    $dock.classList.add('hidden'); $dock.hidden=true;
    emit('cb:build:close'); INF('geschlossen');
  }
  function toggleDock(){ IS_OPEN ? closeDock() : openDock(); }

  /* ================================ [INIT] ================================= */
  async function initAndRender(){
    if(INIT_DONE) return; INIT_DONE=true;
    renderDockSkeleton();

    const okReg = await loadFromRegistry();
    if (!okReg) await loadFromJSON();

    renderCategories();
    renderGrid();
    INF('bereit',{buildings:BUILDINGS.length,categories:CATEGORIES.length});
  }

  /* =============================== [EVENTS] ================================ */
  addEventListener('cb:ui-ready',        ()=>LOG('UI bereit'));
  addEventListener('cb:assets-ready',    initAndRender,{once:true});
  addEventListener('cb:registry:ready',  initAndRender,{once:true});

  // Auto-Open bei Spielstart (kannst du rausnehmen, falls nicht gewünscht)
  addEventListener('cb:game:start',      openDock);

  // Kompatible Open/Close-Events
  addEventListener('req:buildmenu:show', openDock);   // legacy
  addEventListener('cb:build:open',      openDock);
  addEventListener('cb:build:close',     closeDock);

  // Moderne Requests
  addEventListener('req:build:open',     openDock);
  addEventListener('req:build:close',    closeDock);
  addEventListener('req:build:toggle',   toggleDock);

  // ESC schließt
  window.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeDock(); });

  // Legacy Bridge: begin → start (Game erwartet buildingId)
  addEventListener('req:place:begin', (ev)=>{
    const b = ev.detail?.building;
    if (b && b.id) dispatchEvent(new CustomEvent('req:place:start', { detail:{ buildingId: b.id } }));
  });

  // Toggle-Button
  if($btnBuild){
    $btnBuild.onclick=()=>toggleDock();
    $btnBuild.hidden=false;
  }

  LOG('geladen v25.10.27-build2');
})();
