/* =======================================================================
 * Datei: assets/ui/ui-build.js
 * Version: v18.3.2 (compat, mit setItems)
 * Zweck: Bau-Menü (Dock) – robuste UI + öffentliche API für externe Daten
 * ======================================================================= */
(function () {
  'use strict';

  const MOD = '[ui-build]';
  const VER = 'v18.3.2';
  const log  = (m)=> (window.CBLog?.info || console.log)(`${MOD} ${m}`);
  const ok   = (m)=> (window.CBLog?.ok   || console.log)(`${MOD} ${m}`);
  const warn = (m)=> (window.CBLog?.warn || console.warn)(`${MOD} ${m}`);

  // --------- DOM basics --------------------------------------------------------
  function host(){
    return document.getElementById('build-dock')
        || document.getElementById('build-panel')
        || (()=>{
             const d=document.createElement('div');
             d.id='build-dock'; document.body.appendChild(d); return d;
           })();
  }
  function fire(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch(_){} }
  function isOpen(){ return host().classList.contains('is-open'); }
  function open(){ host().classList.add('is-open');  document.body.classList.add('has-build-open');  fire('cb:build:open'); }
  function close(){ host().classList.remove('is-open'); document.body.classList.remove('has-build-open'); fire('cb:build:close'); }
  function toggle(){ isOpen()?close():open(); }

  // --------- CSS ---------------------------------------------------------------
  function injectCSS(){
    if (injectCSS._done) return; injectCSS._done=true;
    const css = `
    .ui-build-dock,#build-panel{
      position:fixed; left:0; right:0; bottom:0; z-index:1000;
      transform:translateY(110%); opacity:0; transition:transform .24s ease,opacity .24s ease;
      background:rgba(22,26,30,.92); color:#e9eef4; backdrop-filter:blur(8px);
      border-top:1px solid rgba(255,255,255,.08); padding:12px;
      max-height:var(--build-dock-max-h, 320px); overflow:auto;
    }
    .ui-build-dock.is-open,#build-panel.is-open{ transform:none; opacity:1; }
    .ui-build-empty{ padding:12px; margin:6px; border-radius:10px; text-align:center;
      background:rgba(10,12,14,.66); border:1px dashed rgba(255,255,255,.15); }
    .ui-build-section{ margin:8px 4px 14px; }
    .ui-build-section>h3{ margin:0 0 8px; font:600 14px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; opacity:.9; }
    .ui-build-grid{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
    .ui-build-card{ display:grid; grid-template-rows:1fr auto; gap:6px; align-items:center; justify-items:center;
      padding:8px; border-radius:12px; border:1px solid rgba(255,255,255,.12);
      background:rgba(10,12,14,.66); color:#e9eef4; cursor:pointer; }
    .ui-build-card .img{ display:flex; align-items:center; justify-content:center; width:100%; height:76px; }
    .ui-build-card img{ width:96px; height:72px; object-fit:contain; }
    .ui-build-card .label{ font-size:13px; line-height:1.25; text-align:center; }
    @media (min-width: 920px){ .ui-build-grid{ grid-template-columns:repeat(6,minmax(0,1fr)); } }
    `;
    const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  }

  // --------- Render ------------------------------------------------------------
  let _items = []; // [{category, items:[{id,label,icon,data}]}]

  function render(){
    injectCSS();
    const root = host();
    root.classList.add('ui-build-dock');
    root.innerHTML='';

    if (!_items || !_items.some(c=>Array.isArray(c.items)&&c.items.length)){
      const empty=document.createElement('div'); empty.className='ui-build-empty';
      empty.textContent='Keine Gebäude verfügbar';
      root.appendChild(empty);
      return;
    }

    for (const cat of _items){
      const sec=document.createElement('section'); sec.className='ui-build-section';
      const h=document.createElement('h3'); h.textContent = cat.category || 'Kategorie'; sec.appendChild(h);
      const grid=document.createElement('div'); grid.className='ui-build-grid';

      for (const it of (cat.items||[])){
        if (!it?.id) continue;
        const btn=document.createElement('button'); btn.type='button'; btn.className='ui-build-card';
        const wrap=document.createElement('div'); wrap.className='img';
        const img=document.createElement('img'); img.loading='lazy'; img.decoding='async';
        img.alt=it.label||it.id||''; img.src= it.icon || 'assets/ui/placeholder.build.png';
        wrap.appendChild(img);
        const lab=document.createElement('div'); lab.className='label'; lab.textContent= it.label || it.id || '';
        btn.appendChild(wrap); btn.appendChild(lab);
        btn.addEventListener('click',()=>select(it));
        grid.appendChild(btn);
      }

      sec.appendChild(grid);
      root.appendChild(sec);
    }
  }

  function select(it){
    const detail={ id: it.id, item: it };
    try{ window.dispatchEvent(new CustomEvent('cb:build:select',{detail})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent('build:select',{detail})); }catch(_){}
    // Backward-Hooks
    try{ window.GameTool?.set?.('build', it.id); }catch(_){}
    try{ window.Game?.setBuildTarget?.(it.id); }catch(_){}
    ok(`select ${it.id}`);
  }

  // --------- Öffentliche API ---------------------------------------------------
  window.UIBuild = {
    version: VER,
    isOpen, open, close, toggle, render,
    /** Erwartet: [{ category:'...', items:[{ id, label, icon, data? }, ...] }, ...] */
    setItems(list){
      if (!Array.isArray(list)) { warn('setItems: kein Array'); return; }
      _items = list.map(cat => ({
        category: cat.category || cat.title || cat.name || 'Kategorie',
        items: (cat.items||[]).map(x=>({
          id: x.id || x.key || x.type || x.name,
          label: x.label || x.name || x.title || x.id,
          icon: x.icon || x.image || x.sprite || null,
          data: x.data || {}
        }))
      }));
      ok(`Items gesetzt (${_items.reduce((s,c)=>s+(c.items?.length||0),0)} Karten / ${_items.length} Kategorien)`);
      render();
    }
  };

  // --------- Layout-Helpers ----------------------------------------------------
  function syncMaxH(){
    const h=Math.max(200,Math.min(320,Math.round(window.innerHeight*0.40)));
    document.documentElement.style.setProperty('--build-dock-max-h', `${h}px`);
  }
  syncMaxH(); window.addEventListener('resize', syncMaxH);
  document.addEventListener('keydown', (ev)=>{ if((ev.key||'').toLowerCase()==='b') toggle(); });

  ok(`bereit (${VER})`);
})();
