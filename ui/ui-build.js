// ============================================================================
// Datei : ui/ui-build.js
// Projekt: Neue Siedler
// Version: v1.0.5
// ============================================================================
(() => {
  const log  = (...a)=>(window.CBLog?.ok||console.log)('[ui-build]',...a);
  const warn = (...a)=>(window.CBLog?.warn||console.warn)('[ui-build]',...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));
  const q    = s=>document.querySelector(s);

  let activeCat=null, activeItem=null;
  let _initialized = false;   // ← NEU: verhindert doppeltes Rendern bei mehreren Events

  function ensureScaffold(){
    const dock = q('#build-dock'); if(!dock){ warn('Container #build-dock fehlt'); return null; }
    dock.hidden=false; dock.classList.remove('hidden'); // sichtbar
    if(!dock.querySelector('.wrap')){
      const wrap = document.createElement('div'); wrap.className='wrap'; dock.appendChild(wrap);
    }
    const wrap=q('#build-dock .wrap');
    if(!q('#build-cats'))  wrap.appendChild(Object.assign(document.createElement('ul'), { id:'build-cats', className:'build-cats' }));
    if(!q('#build-items')) wrap.appendChild(Object.assign(document.createElement('ul'), { id:'build-items', className:'build-items' }));
    return { cats:q('#build-cats'), items:q('#build-items') };
  }

// kleine Ressourcen-Icons fürs Kosten-Label
const RES_ICONS = {
  wood:  'assets/icons/resources/wood.png',
  stone: 'assets/icons/resources/stone.png',
  food:  'assets/icons/resources/food.png',
  gold:  'assets/icons/resources/gold.png'
};
  
  function defaultData(){
    const cats=[{id:'infra',label:'Infrastruktur'},{id:'prod',label:'Produktion'}];
    const buildings=[
      { id:'hq_wood', cat:'infra', label:'HQ (Holz)',    icon:'assets/icons/buildings/hq.png', cost:{wood:0,stone:0} },
      { id:'lumber',  cat:'prod',  label:'Holzfäller',   icon:'assets/icons/buildings/lumber.png',  cost:{wood:6,stone:2} },
      { id:'fisher',  cat:'prod',  label:'Fischerhütte', icon:'assets/icons/buildings/fisher.png',  cost:{wood:6,stone:2} },
      { id:'quarry',  cat:'prod',  label:'Steinbruch',   icon:'assets/icons/buildings/quarry.png',  cost:{wood:6,stone:4} },
    ];
    return { cats, buildings };
  }
  function readData(){
    if (window.BuildBridge?.view) return window.BuildBridge.view();
    const cats=(window.Registry?.get?.('categories')||[]).map(c=>({id:String(c.id),label:String(c.label??c.id)}));
    const buildings=(window.Registry?.get?.('buildings')||[]).map(b=>({
      id:String(b.id), cat:String(b.cat??'misc'), label:String(b.label??b.id), icon:(b.icon||''), cost:(b.cost||null)
    }));
    if (cats.length && buildings.length) return {cats,buildings};
    if (window.BuildCategories?.allBuildings?.length){
      const view=window.BuildCategories.allBuildings.reduce((acc,b)=>{
        if(!acc.cats.find(c=>c.id===b.cat)) acc.cats.push({id:b.cat,label:b.cat});
        acc.buildings.push({id:b.id,cat:b.cat,label:(b.name||b.id),icon:(b.icon||''),cost:(b.cost||null)});
        return acc;
      },{cats:[],buildings:[]});
      if(view.cats.length&&view.buildings.length) return view;
    }
    return defaultData();
  }

  function applyCatHighlight(root){
    root.querySelectorAll('li').forEach(li=>li.classList.toggle('active', li.dataset.cat===activeCat));
  }
  function applyItemHighlight(root){
    root.querySelectorAll('li').forEach(li=>{
      li.classList.toggle('is-selected', li.dataset.id===activeItem);
      li.classList.toggle('active',      li.dataset.id===activeItem);
    });
  }

function resChip(type, amount){
  const n = Number(amount||0);
  if (!n) return null;
  const span = document.createElement('span');
  span.className = `res res-${type}`;
  const img = document.createElement('img');
  img.src = RES_ICONS[type] || '';
  img.alt = type;
  img.loading = 'lazy'; img.decoding = 'async';
  const num = document.createElement('b');
  num.textContent = String(n);
  span.append(img, num);
  return span;
}
  
  function renderCats(root, cats){
    root.innerHTML='';
    cats.forEach((c,idx)=>{
      const li=document.createElement('li');
      li.className='build-cat'; li.dataset.cat=c.id; li.textContent=c.label;
      if(!activeCat && idx===0) activeCat=c.id;
      li.addEventListener('click',()=>{ activeCat=c.id; applyCatHighlight(root); renderItems(q('#build-items'), readData().buildings); });
      root.appendChild(li);
    });
    applyCatHighlight(root);
  }

  
  function renderItems(root, buildings){
  root.innerHTML = '';
  const list = buildings.filter(b => b.cat === activeCat);
  list.forEach(b => {
    const li = document.createElement('li');
    li.className = 'build-item';
    li.dataset.id = b.id;

    // 1) Titel oben
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = b.label;
    li.appendChild(title);

    // 2) Gebäude-Icon in der Mitte
    if (b.icon){
      const img = document.createElement('img');
      img.className = 'thumb';
      img.loading='lazy'; img.decoding='async';
      img.src = b.icon; img.alt = b.label;
      li.appendChild(img);
    } else {
      // Fallback-Icon (optional)
      const ph = document.createElement('div');
      ph.className = 'thumb';
      ph.style.opacity = .3;
      li.appendChild(ph);
    }

    // 3) Kosten unten als kleine Badges
    const costRow = document.createElement('div');
    costRow.className = 'cost';
    const c = b.cost || {};
    [ ['wood', c.wood], ['stone', c.stone], ['food', c.food], ['gold', c.gold] ]
      .map(([t,v]) => resChip(t, v))
      .filter(Boolean).forEach(el => costRow.appendChild(el));
    li.appendChild(costRow);

    // Auswahl-Klick -> Event + Highlight
    li.addEventListener('click', () => {
      activeItem = b.id;
      applyItemHighlight(root);
      EVT('cb:build:select', { id:b.id });
    });

    root.appendChild(li);
  });
  applyItemHighlight(root);
}
  

  function init(){
    if (_initialized) { log('init (skip – already initialized)'); return; } // ← NEU
    const els=ensureScaffold(); if(!els) return;
    const data=readData();
    renderCats(els.cats, data.cats);
    renderItems(els.items, data.buildings);
    _initialized = true; // ← NEU
    log('init ✓');
  }

  window.addEventListener('cb:registry-ready', init);
  window.addEventListener('cb:registry:ready', init);
  window.addEventListener('cb:game-start', init); // Fallback: spätestens hier
})();
