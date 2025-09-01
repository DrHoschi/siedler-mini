/* assets/ui/ui-build.js — v16.4.2
   Build-Menü (Tabs + Thumbs) • fixed UI (nicht zoombar) • FAB links unten
   Infrastruktur (Straße/Weg) + Tools (Abbrechen)
*/
(function () {
  'use strict';

  var VERSION = 'v16.4.2';
  var log  = (window.CBLog && CBLog.ok  ? CBLog.ok  : console.log);
  var warn = (window.CBLog && CBLog.warn? CBLog.warn: console.warn);

  var UI = (window.GameUI = window.GameUI || {});
  UI._build = UI._build || {};

  // Thumbs / Icons
  var THUMBS = {
    // Wohnen
    house0: 'assets/tex/building/wood/Wohnhaus_wood0_ug0.png',
    house1: 'assets/tex/building/wood/Wohnhaus_wood1_ug0.png',
    // Produktion
    lumberjack: 'assets/tex/building/wood/lumberjack_wood.PNG',
    farm:       'assets/tex/building/wood/farm_wood.png',
    mill:       'assets/tex/building/wood/windmuehle_wood.PNG',
    smith:      'assets/tex/building/wood/Schmied_wood0.png',
    // Lager/Verwaltung
    depot:      'assets/tex/building/wood/depot_wood.png',
    townhall:   'assets/tex/building/Holz_Rathaus_1.png'
  };

  // Kategorien
  var CATS = [
    { id:'home',  title:'Wohnen',      items:[['house0','Haus I'],['house1','Haus II']] },
    { id:'prod',  title:'Produktion',  items:[['lumberjack','Holzfäller'],['farm','Farm'],['mill','Mühle'],['smith','Schmied']] },
    { id:'store', title:'Lager',       items:[['depot','Depot'],['townhall','Rathaus']] },
    { id:'infra', title:'Infrastruktur', items:[
      ['__road__','Straße'], ['__path__','Weg']
    ]},
    { id:'tools', title:'Tools',       items:[['__cancel__','Abbrechen']] }
  ];

  var $root, $panel, $tabs, $grid, $fab;
  var state = { open:false, activeCat:'home', ready:false };

  function el(tag, cls, html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  function ensureRoot(){
    if ($root) return;
    injectFallbackCSS();

    $root = el('div','cb-build-root'); document.body.appendChild($root);

    $fab = el('button','cb-build-fab','<span class="i-bricks"></span>'); $fab.title='Bau-Menü';
    $fab.addEventListener('click', togglePanel); $root.appendChild($fab);

    $panel = el('div','cb-build-panel'); $root.appendChild($panel);
    $tabs  = el('div','cb-build-tabs');  $panel.appendChild($tabs);
    $grid  = el('div','cb-build-grid');  $panel.appendChild($grid);

    var $close = el('button','cb-build-close','×'); $close.title='Schließen';
    $close.addEventListener('click', closePanel); $panel.appendChild($close);

    CATS.forEach(function(c){
      var b = el('button','cb-tab', c.title); b.dataset.cat=c.id;
      b.addEventListener('click', function(){ state.activeCat=c.id; renderGrid(); markActiveTab(); });
      $tabs.appendChild(b);
    });
    markActiveTab(); renderGrid();
  }

  function markActiveTab(){
    var btns = $tabs.querySelectorAll('.cb-tab');
    for (var i=0;i<btns.length;i++){
      var b=btns[i];
      if (b.dataset.cat===state.activeCat) b.classList.add('active'); else b.classList.remove('active');
    }
  }

  function renderGrid(){
    $grid.innerHTML='';
    var cat=null; for (var i=0;i<CATS.length;i++){ if(CATS[i].id===state.activeCat){ cat=CATS[i]; break; } }
    if (!cat){ return; }
    if (!cat.items || !cat.items.length){ $grid.appendChild(el('div','cb-empty','<em>Keine Einträge.</em>')); return; }

    cat.items.forEach(function(pair){
      var key = pair[0], label = pair[1];
      var isTool = key.indexOf('__')===0;
      var card = el('button','cb-item'); card.title=label;

      if (isTool){
        var ico = el('div','cb-tool-ico', key==='__cancel__'?'✕': (key==='__road__'?'▦':'▤'));
        card.appendChild(ico);
      } else {
        var url = THUMBS[key]||''; var img = el('img','cb-thumb'); if(url) img.src=url; card.appendChild(img);
      }
      var cap = el('div','cb-cap', label); card.appendChild(cap);

      card.addEventListener('click', function(){
        if (!window.Game){ warn('[ui-build] Game nicht verfügbar'); return; }
        if (isTool){
          if (key==='__cancel__'){ Game.clearTool(); closePanel(); return; }
          if (key==='__road__'){ Game.setTool('road'); closePanel(); return; }
          if (key==='__path__'){ Game.setTool('path'); closePanel(); return; }
        } else {
          Game.setTool('build', {key:key}); closePanel();
        }
        log('[ok] Tool gesetzt:', isTool?key:('build:'+key));
      });

      $grid.appendChild(card);
    });
  }

  function openPanel(){ state.open=true;  $panel.classList.add('open');  $fab.classList.add('raised'); }
  function closePanel(){ state.open=false; $panel.classList.remove('open'); $fab.classList.remove('raised'); }
  function togglePanel(){ state.open ? closePanel() : openPanel(); }

  UI.openBuild   = openPanel;
  UI.closeBuild  = closePanel;
  UI.toggleBuild = togglePanel;

  UI._build.onGameStarted = function(){ state.ready=true; closePanel(); };

  window.addEventListener('cb:game-started', function(){
    if (UI._build && typeof UI._build.onGameStarted==='function') UI._build.onGameStarted();
  });

  function init(){ ensureRoot(); log('[ok] Bau-Menü bereit (ui-build.js '+VERSION+')'); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();

  function injectFallbackCSS(){
    if (document.getElementById('cb-build-fallback-css')) return;
    var css = [
      '.cb-build-root{position:fixed;left:0;bottom:0;right:0;pointer-events:none;z-index:10000;}',
      '.cb-build-fab{pointer-events:auto;position:fixed;left:16px;bottom:16px;width:56px;height:56px;border-radius:50%;border:none;background:rgba(30,30,30,.85);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35);backdrop-filter:blur(6px);}',
      '.cb-build-fab.raised{transform:translateY(-88px);}',
      '.cb-build-panel{pointer-events:auto;position:fixed;left:8px;right:8px;bottom:84px;max-width:1140px;margin:0 auto;background:rgba(16,24,20,.85);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px 12px 16px;display:none;box-shadow:0 20px 60px rgba(0,0,0,.5);backdrop-filter:blur(10px);} ',
      '.cb-build-panel.open{display:block;}',
      '.cb-build-close{position:absolute;right:6px;top:6px;width:32px;height:32px;border-radius:8px;border:none;background:rgba(255,255,255,.06);color:#fff;font-size:18px;}',
      '.cb-build-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:4px 4px 10px;}',
      '.cb-build-tabs .cb-tab{border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.08);color:#fff;}',
      '.cb-build-tabs .cb-tab.active{background:rgba(76,175,80,.25);}',
      '.cb-build-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;}',
      '.cb-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.04);color:#fff;}',
      '.cb-thumb{width:64px;height:64px;object-fit:contain;image-rendering:auto;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35));}',
      '.cb-tool-ico{width:64px;height:64px;display:flex;align-items:center;justify-content:center;font-size:34px;opacity:.95;}',
      '.cb-cap{font-size:13px;opacity:.95;}',
      '.cb-empty{opacity:.7;padding:16px;}'
    ].join('');
    var st = document.createElement('style'); st.id='cb-build-fallback-css'; st.textContent=css; document.head.appendChild(st);
  }
})();
