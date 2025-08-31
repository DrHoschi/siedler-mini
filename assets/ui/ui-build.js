/*! ui-build.js v16.2.9 — Build-Menü mit Tabs/Kategorien (ES5) */
(function(){
  'use strict';
  var VERSION='v16.2.9';

  function $(s,r){return (r||document).querySelector(s);}
  function $all(s,r){return [].slice.call((r||document).querySelectorAll(s));}
  function on(el,ev,fn,opt){el&&el.addEventListener&&el.addEventListener(ev,fn,opt||false);}
  function ok(){ (window.CBLog&&CBLog.ok?CBLog.ok:console.log).apply(console, arguments); }

  // Kategorien & Items (sichtbar im Menü)
  var CATS = [
    { id:'wohnen',      label:'Wohnen',      items:[
      { key:'house0',  label:'Haus I' },
      { key:'house1',  label:'Haus II' },
    ]},
    { id:'produktion',  label:'Produktion',  items:[
      { key:'lumberjack', label:'Holzfäller' },
      { key:'farm',       label:'Farm' },
      { key:'mill',       label:'Mühle' }
    ]},
    { id:'lager',       label:'Lager',       items:[
      { key:'depot',      label:'Depot' },
      { key:'townhall',   label:'Rathaus' }
    ]},
    { id:'wege',        label:'Wege',        items:[
      { tool:'path', label:'Weg' },
      { tool:'road', label:'Straße' }
    ]},
    { id:'tools',       label:'Tools',       items:[
      { tool:'bulldozer', label:'Abriss' }
    ]}
  ];

  function ensureDock(){
    var dock = $('#build-dock');
    if (!dock){
      dock = document.createElement('nav');
      dock.id = 'build-dock';
      document.body.appendChild(dock);
    }

    // Tabsleisten erzeugen (falls nicht vorhanden)
    var tabs = $('#build-tabs');
    if (!tabs){
      tabs = document.createElement('div');
      tabs.id = 'build-tabs';
      document.body.appendChild(tabs);
    }

    // Render Tabs
    tabs.innerHTML = CATS.map(function(c,i){
      return '<button type="button" data-tab="'+c.id+'" class="'+(i===0?'active':'')+'">'+c.label+'</button>';
    }).join('');

    // Render Dock-Buttons der aktiven Kategorie
    function renderCat(catId){
      var cat = CATS.filter(function(c){return c.id===catId;})[0] || CATS[0];
      dock.innerHTML = cat.items.map(function(it){
        if (it.key){
          return '<button data-tool="build" data-key="'+it.key+'" title="'+(it.label||it.key)+'">'+(it.icon||'🏗️')+' '+it.label+'</button>';
        } else {
          return '<button data-tool="'+it.tool+'" title="'+(it.label||it.tool)+'">'+(it.icon||'🧰')+' '+it.label+'</button>';
        }
      }).join('');
      bindButtons();
    }

    function bindButtons(){
      var root = document.body;
      $all('#build-dock [data-tool]', root).forEach(function(btn){
        on(btn,'click', function(){
          var t = btn.getAttribute('data-tool');
          var k = btn.getAttribute('data-key');
          // Toggle: aktiv? -> clear
          if (btn.classList.contains('active')){
            if (window.Game && Game.clearTool) Game.clearTool();
            $all('#build-dock [data-tool].active', root).forEach(function(b){b.classList.remove('active');});
            return;
          }
          // sonst aktivieren
          $all('#build-dock [data-tool].active', root).forEach(function(b){b.classList.remove('active');});
          btn.classList.add('active');

          if (t==='build' && k){
            if (window.Game && Game.setTool) Game.setTool('build', {key:k});
          } else if (window.Game && Game.setTool){
            Game.setTool(t||null);
          }
        });
      });
    }

    // Tab-Click
    $all('#build-tabs [data-tab]').forEach(function(tb){
      on(tb,'click', function(){
        $all('#build-tabs [data-tab].active').forEach(function(b){b.classList.remove('active');});
        tb.classList.add('active');
        renderCat(tb.getAttribute('data-tab'));
      });
    });

    // initial
    renderCat(CATS[0].id);

    // Callback für Game → UI entaktivieren wenn Tool geklärt
    if (!window.GameUI) window.GameUI = {};
    window.GameUI.onToolCleared = function(){
      $all('#build-dock [data-tool].active').forEach(function(b){b.classList.remove('active');});
    };

    ok('[ok] Bau-Menü bereit (ui-build.js '+VERSION+')');
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', ensureDock); }
  else { ensureDock(); }
})();
