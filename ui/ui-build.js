/* ============================================================================
 * Datei   : ui/ui-build.js
 * Version : v1.0.5
 * Zweck   : Build-Dock – Kacheln (Titel | Thumb | Kosten) + Auswahl-Events
 * ========================================================================== */
(() => {
  const log  = (...a)=>(window.CBLog?.ok||console.log)('[ui-build]',...a);
  const warn = (...a)=>(window.CBLog?.warn||console.warn)('[ui-build]',...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));
  const q    = s=>document.querySelector(s);

  // kleine Icon-Lookup für Kosten-Anzeige
  const RES_ICON = {
    wood:  'assets/icons/resources/wood.png',
    stone: 'assets/icons/resources/stone.png',
    food:  'assets/icons/resources/food.png',
    gold:  'assets/icons/resources/gold.png'
  };

  let activeCat=null, activeItem=null;

  function ensureScaffold(){
    const dock = q('#build-dock'); if(!dock){ warn('Container #build-dock fehlt'); return null; }
    dock.hidden=false; dock.classList.remove('hidden');
    if(!dock.querySelector('.wrap')){
      dock.appendChild(Object.assign(document.createElement('div'), { className:'wrap' }));
    }
    const wrap=q('#build-dock .wrap');
    if(!q('#build-cats'))  wrap.appendChild(Object.assign(document.createElement('ul'), { id:'build-cats', className:'build-cats' }));
    if(!q('#build-items')) wrap.appendChild(Object.assign(document.createElement('ul'), { id:'build-items', className:'build-list' }));
    return { cats:q('#build-cats'), items:q('#build-items') };
  }

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
    const cats=(window.Registry?.list?.('category')||window.Registry?.get?.('categories')||[])
      .map(c=>({id:String(c.id),label:String(c.label??c.id)}));
    const buildings=(window.Registry?.list?.('building')||window.Registry?.get?.('buildings')||[])
      .map(b=>({ id:String(b.id), cat:String(b.cat??b.category??'misc'),
                 label:String(b.label??b.name??b.id),
                 icon:(b.icon||b.sprite||''), cost:(b.cost||null) }));
    if (cats.length && buildings.length) return {cats,buildings};
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

  function resBadge(key, amount){
    if (!amount) return null;
    const span=document.createElement('span'); span.className='res';
    const img=document.createElement('img'); img.src=RES_ICON[key]||''; img.alt=key;
    const txt=document.createElement('b'); txt.textContent=String(amount);
    span.append(img, txt);
    return span;
  }

  function renderItems(root, buildings){
    root.innerHTML='';
    const list=buildings.filter(b=>b.cat===activeCat);
    list.forEach(b=>{
      const li=document.createElement('li'); li.className='build-item'; li.dataset.id=b.id;

      // Titel
      const title=document.createElement('div'); title.className='title'; title.textContent=b.label;

      // Icon (Thumb)
      const thumb=document.createElement('img'); thumb.className='thumb'; thumb.loading='lazy'; thumb.decoding='async';
      if (b.icon) { thumb.src=b.icon; thumb.alt=b.label; }

      // Kosten
      const cost=document.createElement('div'); cost.className='cost';
      const costObj = b.cost||{};
      ['wood','stone','food','gold'].forEach(k=>{
        const node = resBadge(k, costObj[k]);
        if (node) cost.appendChild(node);
      });

      li.append(title, thumb, cost);
      li.addEventListener('click',()=>{ activeItem=b.id; applyItemHighlight(root); EVT('cb:build:select',{id:b.id}); });
      root.appendChild(li);
    });
    applyItemHighlight(root);
  }

  function init(){
    const els=ensureScaffold(); if(!els) return;
    const data=readData();
    renderCats(els.cats, data.cats);
    renderItems(els.items, data.buildings);
    log('init ✓');
  }

  // Lebenszyklus-Hooks (konform Lastenheft)
  window.addEventListener('cb:registry-ready', init);
  window.addEventListener('cb:registry:ready', init);
  window.addEventListener('cb:game-start', init); // Fallback
})();
/* --- Toggle-Button (unten links) --- */
.ui-btn-build {
  position: fixed; left: 12px; bottom: 12px;
  z-index: calc(var(--build-dock-z) + 1); /* über dem Dock */
  padding: 10px 14px; border-radius: 8px;
  border: 1px solid #ffffff33;
  background: #2b3138; color: #e6f0ff; cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,.28);
}
.ui-btn-build[aria-expanded="true"] {
  border-color: #8ab4f8; box-shadow: 0 0 0 2px #8ab4f840 inset;
}

/* --- Dock Grundzustand: per [hidden] ausgeblendet (regel hast du schon) --- */
/* #build-dock[hidden]{ display:none !important; } */

/* Optional: kleines „öffnen“-Slide-In */
#build-dock { transition: transform .14s ease, opacity .14s ease; opacity: 1; transform: translateY(0); }
#build-dock[hidden] { opacity: 0; transform: translateY(8px); }
