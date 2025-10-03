/* ============================================================================
 * Datei   : ui/ui-build.js
 * Projekt : Neue Siedler
 * Version : v2.2.0 (2025-10-04)
 * Zweck   : Build-Dock (Bilder/Labels/Kosten) + Events (cb:build:select)
 * API     : window.UIBuild.mount(el?), .setCategories(), .setItems(), .open()
 * ============================================================================
 */
(function(){
  'use strict';

  // ---------------------------- Konstanten/Logging ---------------------------
  const LOG = (window.CBLog?.info || console.log).bind(console, '[ui-build]');

  // ---------------------------- Interner Zustand -----------------------------
  let host = null;                 // Mount-Host (z.B. <aside id="build-panel">)
  let cats = [];                   // [{id,label}]
  let items = [];                  // [{id,cat,label,icon,cost,enabled}]
  let activeCat = null;
  let activeItem = null;
  let iconBase = 'assets/ui/build/';

  // ---------------------------- Helpers -------------------------------------
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  function ensureScaffold(){
    if (!host) return null;
    if (!host.querySelector('.ui-build-wrap')){
      host.innerHTML = `
        <div class="ui-build-wrap">
          <ul id="build-cats" class="build-cats"></ul>
          <ul id="build-items" class="build-list"></ul>
        </div>
      `;
      const dock = document.getElementById('build-dock');
      if (dock){ dock.hidden=false; dock.classList.remove('hidden'); }
      host.hidden=false; host.classList.remove('hidden');
    }
    return { cats: $('#build-cats',host), items: $('#build-items',host) };
  }

  function adoptFromRegistry(){
    // Kategorien
    if (!cats.length) {
      cats = (window.Registry?.get?.('categories') || []).map(c => ({ id:String(c.id), label:String(c.label ?? c.id) }));
    }
    // Items (Buildings)
    if (!items.length) {
      items = (window.Registry?.get?.('buildings') || []).map(b => ({
        id:String(b.id),
        cat:String(b.cat || 'misc'),
        label:String(b.label || b.id),
        icon:(b.icon || b.sprite || ''),
        cost:(b.cost || null),
        enabled:(b.enabled !== false)
      }));
    }
    // iconsBase
    iconBase = window.Registry?.get?.('iconsBase') || window.Registry?.get?.('meta')?.iconsBase || iconBase;
    if (iconBase && !iconBase.endsWith('/')) iconBase += '/';
  }

  function isAbs(u){ return /^(https?:)?\/\//i.test(u) || /^data:/i.test(u) || u.startsWith('/'); }
  function iconSrc(b){
    if (!b || !b.icon) return '';
    if (isAbs(b.icon)) return b.icon;
    let name = String(b.icon);
    if (!/\.(png|webp|jpg|jpeg|svg)$/i.test(name)) name += '.png';
    return iconBase + name;
  }

  function badge(key, val){
    if (!val) return null;
    const s=document.createElement('span'); s.className='res'; s.dataset.res=key;
    const b=document.createElement('b'); b.textContent=String(val); s.appendChild(b);
    return s;
  }

  function applyCatActive(root){
    $$('.build-cat',root).forEach(li=>li.classList.toggle('active', li.dataset.cat===activeCat));
  }
  function applyItemActive(root){
    $$('.build-item',root).forEach(li=>li.classList.toggle('active', li.dataset.id===activeItem));
  }

  // ---------------------------- Render --------------------------------------
  function renderCats(root){
    root.innerHTML = '';
    cats.forEach((c,idx)=>{
      const li=document.createElement('li');
      li.className='build-cat'; li.dataset.cat=c.id; li.textContent=c.label;
      if (!activeCat && idx===0) activeCat=c.id;
      li.addEventListener('click',()=>{ activeCat=c.id; applyCatActive(root); renderItems($('#build-items',host)); });
      root.appendChild(li);
    });
    applyCatActive(root);
  }

  function renderItems(root){
    root.innerHTML = '';
    const vis = items.filter(b => b.enabled !== false && String(b.cat)===String(activeCat));
    vis.forEach(b=>{
      const li=document.createElement('li'); li.className='build-item'; li.dataset.id=b.id;

      const img=document.createElement('img'); img.className='icon'; img.alt=b.label||b.id; img.decoding='async'; img.loading='lazy'; img.src=iconSrc(b);
      const title=document.createElement('div'); title.className='title'; title.textContent=b.label;
      const cost=document.createElement('div'); cost.className='cost';
      const c=b.cost||{}; ['wood','stone','food','gold'].forEach(k=>{ const x=badge(k,c[k]); if (x) cost.appendChild(x); });

      li.append(img,title,cost);
      li.addEventListener('click', ()=>{
        activeItem=b.id; applyItemActive(root);
        window.dispatchEvent(new CustomEvent('cb:build:select', { detail:{ id:b.id, meta:b }}));
      });
      root.appendChild(li);
    });
    applyItemActive(root);
  }

  function rerender(){
    const els=ensureScaffold(); if (!els) return;
    adoptFromRegistry();
    if (!cats.length){ els.cats.innerHTML=''; els.items.innerHTML=''; return; }
    if (!cats.find(c=>c.id===activeCat)) activeCat = cats[0]?.id || null;
    renderCats(els.cats);
    renderItems(els.items);
    LOG('render ✓', { cats:cats.length, items:items.length, iconBase });
  }

  // ---------------------------- API -----------------------------------------
  window.UIBuild = {
    mount(el){ host = el || document.getElementById('build-panel'); ensureScaffold(); },
    setCategories(next){ cats = (Array.isArray(next)?next:[]).map(c=>({id:String(c.id),label:String(c.label??c.id)})); },
    setItems(next){ items = (Array.isArray(next)?next:[]).map(b=>({ id:String(b.id), cat:String(b.cat||'misc'), label:String(b.label||b.id), icon:(b.icon||b.sprite||''), cost:(b.cost||null), enabled:(b.enabled!==false) })); },
    setIconsBase(base){ iconBase = String(base||iconBase); if (iconBase && !iconBase.endsWith('/')) iconBase+='/'; },
    open(){ const dock=document.getElementById('build-dock'); if(dock){dock.hidden=false;dock.classList.remove('hidden');} if(host){host.hidden=false;host.classList.remove('hidden');} rerender(); },
    close(){ const dock=document.getElementById('build-dock'); if(dock){dock.hidden=true;dock.classList.add('hidden');} if(host){host.hidden=true;host.classList.add('hidden');} },
    rerender
  };

  // ---------------------------- Lifecycle -----------------------------------
  window.addEventListener('cb:registry:ready', ()=>UIBuild.rerender());
  window.addEventListener('cb:registry-ready', ()=>UIBuild.rerender());
  window.addEventListener('cb:game-start', ()=>{ if(!host) UIBuild.mount(document.getElementById('build-panel')); UIBuild.open(); });

  // Safety (erstes Mount bei Idle)
  setTimeout(()=>{ if(!host) UIBuild.mount(document.getElementById('build-panel')); },0);
})();
