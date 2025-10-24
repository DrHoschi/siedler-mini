/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.10.23-fix1
 * Modul    : Baumenü (Build-Dock) – Kategorien + Kartenraster
 * ============================================================================
 * Lauscht  : cb:ui-ready, 
 *            cb:assets-ready, 
 *            cb:registry:ready, 
 *            cb:game:start,
 *            req:buildmenu:show / 
 *            cb:build:open / 
 *            cb:build:close
 * Sendet   : cb:build:open / cb:build:close, req:place:begin { building }
 * DOM      : #build-dock (Container), #btn-build (Toggle)
 * Hinweise : - Failsafe legt #build-dock nur an, wenn er fehlt.
 *            - Doppel-Initialisierung verhindert (INIT_DONE).
 *            - Spielstart öffnet Menü automatisch, außer HUD versteckt es.
 * ============================================================================
 */

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

  // [00] Logger
  const __safeLog = (fn, tag, ...m)=>{
    try{ (window.CBLog?.[fn]||console[fn]||console.log)(tag, ...m); }catch{}
  };
  const LOG = (...m)=>__safeLog('log',  '[build]', ...m);
  const INF = (...m)=>__safeLog('info', '[build]', ...m);
  const WRN = (...m)=>__safeLog('warn', '[build]', ...m);
  const ERR = (...m)=>__safeLog('error','[build]', ...m);

  // [01] DOM
  const $dock     = document.getElementById('build-dock');
  const $btnBuild = document.getElementById('btn-build');
  if (!$dock){ ERR('DOM: #build-dock fehlt'); return; }

  // [02] State
  let BUILDINGS=[], CATEGORIES=[], ACTIVE_CAT='all', IS_OPEN=false, INIT_DONE=false;

  // [03] Utils
  const iconRes=id=>`assets/icons/resources/${id}.png`;
  const iconBld=id=>`assets/icons/buildings/${id}.png`;
  const emit=(n,d={})=>window.dispatchEvent(new CustomEvent(n,{detail:d}));
  const byCat=(arr,cat)=>cat==='all'?arr:arr.filter(b=>(b.categories||[]).includes(cat));

  function normalizeBuilding(raw){
    const id=String(raw.id||'').trim();
    const name=raw.name||id||'Unbenannt';
    const cats=Array.isArray(raw.categories)?raw.categories:(raw.category?[raw.category]:['misc']);
    const image=raw.image||iconBld(id);
    let cost=[];
    if (Array.isArray(raw.cost)) cost=raw.cost.map(c=>({id:String(c.id),amount:+c.amount||0})).filter(c=>c.id&&c.amount>0);
    else if (raw.cost&&typeof raw.cost==='object')
      cost=Object.keys(raw.cost).map(k=>({id:k,amount:+raw.cost[k]||0})).filter(c=>c.amount>0);
    return {id,name,categories:cats,image,cost};
  }

  // [04] Datenquelle
  async function loadBuildings(){
    try{
      const res=await fetch('data/buildings.json',{cache:'no-store'});
      const json=await res.json();
      const arr=Array.isArray(json)?json:(json?.buildings||[]);
      BUILDINGS=arr.map(normalizeBuilding);
      INF('Datenquelle: data/buildings.json',BUILDINGS.length);
    }catch(e){ERR('Buildings laden fehlgeschlagen',e);BUILDINGS=[];}
  }

  function buildCategories(){
    const map=new Map();
    BUILDINGS.forEach(b=>(b.categories||[]).forEach(c=>map.set(c,(map.get(c)||0)+1)));
    CATEGORIES=Array.from(map.entries()).map(([id,count])=>({id,name:id,count}))
      .sort((a,b)=>a.id.localeCompare(b.id));
    CATEGORIES.unshift({id:'all',name:'Alles',count:BUILDINGS.length});
    if(!CATEGORIES.some(c=>c.id===ACTIVE_CAT))ACTIVE_CAT='all';
  }

  // [05] Render-Grundstruktur
  function renderDockSkeleton(){
    $dock.innerHTML=`
      <div class="build-dock__head">
        <div class="build-dock__title"><span>Baumenü</span>
        <span id="build-count" class="build-dock__count"></span></div>
        <button id="build-close" class="build-dock__close">×</button>
      </div>
      <div class="build-dock__body">
        <div id="build-cats" class="build-cats"></div>
        <div id="build-grid" class="build-grid"></div>
        <div id="build-empty" class="build-empty hidden">Keine Gebäude gefunden.</div>
      </div>`;
    $dock.querySelector('#build-close')?.addEventListener('click',closeDock);
  }

  // [06] Kategorien
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

  // [07] Grid
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
            <div class="build-cost">
              <img src="${iconRes(c.id)}" alt="${c.id}" class="build-cost__icon">
              <span>x${c.amount}</span>
            </div>`).join('')}
        </div>`;
      card.onclick=()=>{
        INF('select', b.id);
         emit('req:place:begin', { building: b });        // Alt für Tools/Inspector weiter senden
         emit('req:place:start', { buildingId: b.id });   // Neu: Game-kompatibel
         emit('cb:set-build-tool', { type: b.id });       // Alt-Event für core.input.js (nur ergänzen)
};
      $grid.appendChild(card);
    });
  }

  // [08] Öffnen/Schließen
  function openDock(){
    if(IS_OPEN)return; IS_OPEN=true;
    $dock.hidden=false; $dock.classList.remove('hidden');
    emit('cb:build:open'); INF('geöffnet');
  }
  function closeDock(){
    if(!IS_OPEN)return; IS_OPEN=false;
    $dock.classList.add('hidden'); $dock.hidden=true;
    emit('cb:build:close'); INF('geschlossen');
  }

  // [09] Init
  async function initAndRender(){
    if(INIT_DONE)return; INIT_DONE=true;
    renderDockSkeleton();
    await loadBuildings();
    buildCategories();
    renderCategories();
    renderGrid();
    INF('bereit',{buildings:BUILDINGS.length,categories:CATEGORIES.length});
  }

  // [10] Events
  addEventListener('cb:ui-ready',        ()=>LOG('UI bereit'));
  addEventListener('cb:assets-ready',    initAndRender,{once:true});
  addEventListener('cb:registry:ready',  initAndRender,{once:true});
  addEventListener('req:buildmenu:show', openDock);
  addEventListener('cb:game:start',      openDock);
  addEventListener('cb:build:open',      openDock);
  addEventListener('cb:build:close',     closeDock);
  window.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeDock();});

  // Bridge: begin → start (Game erwartet buildingId)
addEventListener('req:place:begin', (ev)=>{
  const b = ev.detail?.building;
  if (b && b.id) {
    dispatchEvent(new CustomEvent('req:place:start', { detail:{ buildingId: b.id } }));
  }
});
  
  // [11] Button
  if($btnBuild){
    $btnBuild.onclick=()=>IS_OPEN?closeDock():openDock();
    $btnBuild.hidden=false;
  }

  LOG('geladen v25.10.23-fix1');
})();
