/* assets/ui/ui-bridge.js — v16.5.2 */
(function(){
  'use strict';

  var UI = (window.GameUI = window.GameUI || {});
  var VERSION = 'v16.5.2';

  var $panel, $tabs, $grid, $hint, $btnClose;
  var state = { open:false, tab:'basic', selection:null };

  var CATS = [
    { id:'basic', label:'Basis', items:[
      {key:'road',   name:'Straße',    thumb:'assets/tex/road/road_atlas.png'},
      {key:'path',   name:'Weg',       thumb:'assets/tex/path/topdown_path1.PNG'},
      {key:'bulldozer', name:'Abreißen', thumb:'assets/icons/icons_spritesheet_64.png'}
    ]},
    { id:'wohnen', label:'Wohnen', items:[
      {key:'house0', name:'Wohnhaus 0', thumb:'assets/tex/building/wood/Wohnhaus_wood0_ug0.png'},
      {key:'house1', name:'Wohnhaus 1', thumb:'assets/tex/building/wood/Wohnhaus_wood1_ug0.png'}
    ]},
    { id:'produktion', label:'Produktion', items:[
      {key:'lumberjack', name:'Holzfäller', thumb:'assets/tex/building/wood/lumberjack_wood.PNG'},
      {key:'farm',   name:'Farm',        thumb:'assets/tex/building/wood/farm_wood.png'},
      {key:'mill',   name:'Mühle',       thumb:'assets/tex/building/wood/windmuehle_wood.PNG'},
      {key:'smith',  name:'Schmied',     thumb:'assets/tex/building/wood/Schmied_wood0.png'}
    ]},
    { id:'lager', label:'Lager & HQ', items:[
      {key:'depot',    name:'Depot',   thumb:'assets/tex/building/wood/depot_wood.png'},
      {key:'townhall', name:'Rathaus', thumb:'assets/tex/building/Holz_Rathaus_1.png'},
      {key:'hq',       name:'HQ',      thumb:'assets/tex/building/wood/hq_wood.PNG'}
    ]}
  ];

  function el(tag, cls, html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  function ensurePanel(){
    if ($panel) return;

    $panel = document.createElement('div'); $panel.id = 'build-panel';
    var $head = el('div','', ''); $head.id = 'build-head';
    $head.appendChild(el('div','title','Bau-Menü'));
    var spacer = el('div','spacer',''); $head.appendChild(spacer);
    $btnClose = el('button','', 'Schließen'); $btnClose.id='build-close';
    $btnClose.addEventListener('click', close);
    $head.appendChild($btnClose);
    $panel.appendChild($head);

    $tabs = el('div','', ''); $tabs.id='build-tabs'; $panel.appendChild($tabs);
    $grid = el('div','build-grid',''); $grid.id='build-grid'; $panel.appendChild($grid);

    $hint = el('div','', ''); $hint.id='build-hint';
    $hint.textContent = 'Tipp: Klick auf Karte platziert. ESC oder Rechtsklick bricht ab.';
    $panel.appendChild($hint);

    document.body.appendChild($panel);

    buildTabs();
    renderGrid();
    bindGlobalCancel();
  }

  function buildTabs(){
    $tabs.innerHTML = '';
    CATS.forEach(function(cat){
      var b = el('button','tab'+(cat.id===state.tab?' active':''), cat.label);
      b.dataset.tab = cat.id;
      b.addEventListener('click', function(){
        state.tab = this.dataset.tab;
        Array.prototype.forEach.call($tabs.querySelectorAll('.tab'), function(t){ t.classList.toggle('active', t===b); });
        renderGrid();
      });
      $tabs.appendChild(b);
    });
  }

  function renderGrid(){
    $grid.innerHTML = '';
    var cat = CATS.find(function(c){ return c.id===state.tab; }) || CATS[0];
    cat.items.forEach(function(it){
      var card = el('div','build-item', '');
      var th = el('div','build-thumb', '');
      var img = new Image(); img.src = it.thumb; th.appendChild(img);
      var name = el('div','build-name', it.name);

      card.appendChild(th);
      card.appendChild(name);
      card.addEventListener('click', function(){ selectItem(it.key, card); });

      $grid.appendChild(card);
    });
  }

  function selectItem(key, cardNode){
    Array.prototype.forEach.call($grid.querySelectorAll('.build-item'), function(n){ n.classList.remove('active'); });
    if (cardNode) cardNode.classList.add('active');

    if (key==='road' || key==='path' || key==='bulldozer'){
      try { window.Game && Game.setTool && Game.setTool(key); } catch(_){}
      state.selection = null;
      return;
    }
    state.selection = key;
    try { window.Game && Game.setTool && Game.setTool('build', { key: key }); } catch(_){}
  }

  function bindGlobalCancel(){
    window.addEventListener('keydown', function(e){
      if ((e.key||'').toLowerCase()==='escape'){ resetTool(); }
    });
    window.addEventListener('contextmenu', function(e){
      if ($panel && $panel.classList.contains('open')){
        e.preventDefault(); resetTool();
      }
    });
  }

  function resetTool(){
    try { window.Game && Game.setTool && Game.setTool(null); } catch(_){}
    state.selection = null;
    Array.prototype.forEach.call($grid.querySelectorAll('.build-item'), function(n){ n.classList.remove('active'); });
  }

  function open(){
    ensurePanel();
    if (state.open) return;
    state.open = true;
    $panel.classList.add('open');
    document.body.classList.add('has-build-open');
    try { window.dispatchEvent(new CustomEvent('cb:build-open')); } catch(_){}
  }
  function close(){
    if (!$panel || !state.open) return;
    state.open = false;
    $panel.classList.remove('open');
    document.body.classList.remove('has-build-open');
    resetTool();
    try { window.dispatchEvent(new CustomEvent('cb:build-close')); } catch(_){}
  }
  function toggle(){ if (state.open) close(); else open(); }

  // Exporte
  UI.openBuild = open;
  UI.closeBuild = close;
  UI.toggleBuild = toggle;

  // Inspector vom Button
  UI.toggleInspector = function(){
    try {
      if (window.GameUI && typeof window.GameUI.toggleInspector==='function'){
        window.GameUI.toggleInspector();
      } else if (window.GameUI && typeof window.GameUI.openInspector==='function'){
        // Fallback: wenigstens öffnen
        window.GameUI.openInspector();
      }
    } catch(_){}
  };

  window.addEventListener('cb:game-started', function(){ /* no auto-open */ });

  console.log('[ui-bridge] bereit (v'+VERSION+')');
})();
