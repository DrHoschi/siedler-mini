/* ============================================================================
 * ui-build.js — Tabbed Bau-Menü (2 Zeilen sichtbar, Rest scrollbar)
 * Version: v17.0.3
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[ui-build]';
  var Bridge=window.BuildDataBridge;

  var EVT_CATS_READY='cb:build-categories-ready';
  var EVT_UI_READY='ui:build:ready';
  var EVT_SELECT='ui:build:select';

  var ROW_HEIGHT_PX=64, ROW_GAP_PX=6, HEADER_H_PX=36, PAD_V_PX=8;

  function log(){ try{ console.log.apply(console, arguments);}catch{} }
  function qs(s,r){ return (r||document).querySelector(s); }
  function qsa(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }

  function ensureBaseStyles(){
    if(document.getElementById('ui-build-base-styles')) return;
    var css =
      '.ui-build{position:relative;display:flex;flex-direction:column;width:100%;' +
      '  background:var(--build-bg, rgba(0,0,0,0.25));border-top:1px solid rgba(255,255,255,0.06);}' +
      '.ui-build__tabs{display:flex;align-items:center;gap:8px;height:'+HEADER_H_PX+'px;padding:0 8px;' +
      '  background:var(--build-tabs-bg, rgba(0,0,0,0.15));border-bottom:1px solid rgba(255,255,255,0.06);overflow-x:auto;}' +
      '.ui-build__tab{flex:0 0 auto; padding:6px 10px; cursor:pointer; border-radius:6px;' +
      '  color:var(--text-muted,#cfd6e6); background:transparent; border:1px solid transparent; user-select:none; font-size:13px;}' +
      '.ui-build__tab[aria-selected="true"]{ color:#fff; background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.15);}' +
      '.ui-build__body{ position:relative; padding:'+PAD_V_PX+'px 8px; }' +
      '.ui-build__viewport{ overflow:auto; max-height:'+(PAD_V_PX*2 + ROW_HEIGHT_PX*2 + ROW_GAP_PX)+'px; }' +
      '.ui-build__grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(96px,1fr)); gap:6px; }' +
      '.ui-build__btn{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;' +
      '  height:'+ROW_HEIGHT_PX+'px; padding:6px 6px; border-radius:8px; cursor:pointer; user-select:none;' +
      '  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); }' +
      '.ui-build__btn:hover{ background:rgba(255,255,255,0.07); }' +
      '.ui-build__btn:active{ transform:translateY(1px); }' +
      '.ui-build__icon{ width:28px; height:28px; object-fit:contain; }' +
      '.ui-build__label{ font-size:12px; line-height:1.1; text-align:center; color:#e9eefb; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }' +
      '.ui-build__empty{ color:#9fb0cf; font-size:13px; padding:8px; }';
    var style=document.createElement('style');
    style.id='ui-build-base-styles';
    style.textContent=css; document.head.appendChild(style);
  }

  function el(tag,cls,txt){ var e=document.createElement(tag); if(cls)e.className=cls; if(txt)e.textContent=txt; return e; }
  function fire(name,detail){ window.dispatchEvent(new CustomEvent(name,{detail:detail||{}})); }

  function Dock(opts){
    this.root=opts.root||null;
    this.categories=opts.categories||[];
    this.activeCatId=this.categories[0]?this.categories[0].id:null;
    this.elements={tabs:null,viewport:null,grid:null};
  }

  Dock.prototype.render=function(){
    ensureBaseStyles();
    var mount=qs('#build-panel')||document.body;
    var container=this.root||el('div','ui-build');
    if(!this.root){ mount.appendChild(container); }

    var tabs=el('div','ui-build__tabs'); var self=this;
    this.categories.forEach(function(cat){
      var t=el('button','ui-build__tab',cat.title||cat.id);
      t.type='button'; t.dataset.id=cat.id;
      t.setAttribute('aria-selected',(cat.id===self.activeCatId)?'true':'false');
      t.addEventListener('click',function(){
        self.activeCatId=cat.id;
        qsa('.ui-build__tab',tabs).forEach(function(b){ b.setAttribute('aria-selected', b.dataset.id===self.activeCatId?'true':'false');});
        self.drawGrid();
      });
      tabs.appendChild(t);
    });

    var body=el('div','ui-build__body');
    var viewport=el('div','ui-build__viewport');
    var grid=el('div','ui-build__grid');
    viewport.appendChild(grid); body.appendChild(viewport);
    container.innerHTML=''; container.appendChild(tabs); container.appendChild(body);

    this.elements={tabs:tabs,viewport:viewport,grid:grid};
    this.drawGrid(); return container;
  };

  Dock.prototype.activeItems=function(){
    var c=this.categories.find(function(x){ return x.id===this.activeCatId; },this);
    return c?(c.items||[]):[];
  };

  Dock.prototype.drawGrid=function(){
    var grid=this.elements.grid; grid.innerHTML='';
    var items=this.activeItems();
    if(!items.length){ grid.appendChild(el('div','ui-build__empty','Keine Einträge in dieser Kategorie.')); return; }
    var self=this;
    items.forEach(function(item){
      var btn=el('button','ui-build__btn'); btn.type='button'; btn.title=item.label||item.id;
      var iconSrc=(Bridge&&Bridge.getIconFor)?Bridge.getIconFor(item.id):(item.icon||'');
      var img=el('img','ui-build__icon'); img.alt=item.label||item.id; img.src=iconSrc;
      var lab=el('div','ui-build__label', item.label||item.id);
      btn.appendChild(img); btn.appendChild(lab);
      btn.addEventListener('click', function(){ fire(EVT_SELECT,{ item:item }); });
      grid.appendChild(btn);
    });
  };

  var _dock=null;
  function init(categories,origin){
    try{
      _dock=new Dock({ categories:categories });
      var elc=_dock.render();
      log(MOD,'ready — Kategorien:',categories.length,'Items:',
        categories.reduce((n,c)=>n+(c.items?c.items.length:0),0),'origin:',origin||'unknown');
      fire(EVT_UI_READY,{ el:elc, categories:categories });
    }catch(e){ console.error(MOD,'Init-Fehler',e); }
  }
  function bootExisting(){
    if(Array.isArray(window.BUILD_CATEGORIES)&&window.BUILD_CATEGORIES.length){ init(window.BUILD_CATEGORIES,'boot-existing'); return true; }
    return false;
  }

  if(!bootExisting()){
    window.addEventListener(EVT_CATS_READY, function(ev){
      var cats=(ev&&ev.detail&&ev.detail.categories)?ev.detail.categories:[];
      if(!cats.length) return; init(cats, ev.detail&&ev.detail.source||'event');
    });
  }

  window.UIBuild={
    rerender:function(){
      if(_dock){ document.querySelectorAll('.ui-build').forEach(function(n){ n.remove(); }); _dock.render(); }
      else if(Array.isArray(window.BUILD_CATEGORIES)){ init(window.BUILD_CATEGORIES,'manual'); }
    },
    setItems:function(cats){ if(Array.isArray(cats)&&cats.length){ window.BUILD_CATEGORIES=cats; } this.rerender(); }
  };
})();
