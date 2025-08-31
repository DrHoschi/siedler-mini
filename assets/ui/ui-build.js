/*! ui-build.js v16.3.2 — Build-Menü mit Tabs/Kategorien, manuelles Toggle über #btn-build (ES5) */
(function(){
  'use strict';

  var VERSION='v16.3.2';

  function $(s,r){return (r||document).querySelector(s);}
  function $all(s,r){return [].slice.call((r||document).querySelectorAll(s));}
  function on(el,ev,fn,opt){el&&el.addEventListener&&el.addEventListener(ev,fn,opt||false);}
  function ok(){ (window.CBLog&&CBLog.ok?CBLog.ok:console.log).apply(console, arguments); }
  function warn(){ (window.CBLog&&CBLog.warn?CBLog.warn:console.warn).apply(console, arguments); }

  // Kategorien & Items (Labels/Keys müssen zu game.js passen)
  var CATS = [
    { id:'wohnen',      label:'Wohnen', items:[
      { key:'house0',  label:'Haus I',  icon:'🏠', thumb:'./assets/tex/building/wood/haeuser_wood1.PNG' },
      { key:'house1',  label:'Haus II', icon:'🏘️', thumb:'./assets/tex/building/wood/haeuser_wood2.PNG' }
    ]},
    { id:'produktion',  label:'Produktion', items:[
      { key:'lumberjack', label:'Holzfäller', icon:'🪓', thumb:'./assets/tex/building/wood/lumberjack_wood.PNG' },
      { key:'farm',       label:'Farm',       icon:'🌾', thumb:'./assets/tex/building/wood/farm_wood.PNG' },
      { key:'mill',       label:'Mühle',      icon:'🌬️', thumb:'./assets/tex/building/wood/windmuehle_wood.PNG' }
    ]},
    { id:'lager',       label:'Lager', items:[
      { key:'depot',      label:'Depot',   icon:'📦', thumb:'./assets/tex/building/wood/depot_wood.PNG' },
      { key:'townhall',   label:'Rathaus', icon:'🏰', thumb:'./assets/tex/building/Holz_Rathaus_1.png' }
    ]},
    { id:'wege',        label:'Wege', items:[
      { tool:'path', label:'Weg',   icon:'🟩' },
      { tool:'road', label:'Straße',icon:'🛤️' }
    ]},
    { id:'tools',       label:'Tools', items:[
      { tool:'bulldozer', label:'Abriss', icon:'❌' },
      { tool:'none',      label:'Abbrechen', icon:'⛔' }
    ]}
  ];

  var ui = {
    tabs:null, dock:null, visible:false, activeCat:null,
    btnBuild:null
  };

  function ensureButton(){
    // Toggle-Button (falls nicht in index.html vorhanden, erzeugen wir einen)
    var b = $('#btn-build');
    if (!b){
      b = document.createElement('button');
      b.id = 'btn-build';
      b.title = 'Bau-Menü';
      b.textContent = '🧱';
      // schlichte FAB neben Inspector
      b.style.position='fixed';
      b.style.right='.66rem';
      b.style.bottom='4.6rem';
      b.style.zIndex='95';
      b.style.width='48px';
      b.style.height='48px';
      b.style.border='0';
      b.style.borderRadius='12px';
      b.style.background='rgba(20,32,26,.88)';
      b.style.color='#e6f3ea';
      b.style.fontSize='22px';
      b.style.boxShadow='0 10px 28px rgba(0,0,0,.35)';
      document.body.appendChild(b);
    }
    ui.btnBuild = b;
    on(b,'click', function(){ toggle(); });
  }

  function ensureTabs(){
    var t = $('#build-tabs');
    if (!t){
      t = document.createElement('div');
      t.id = 'build-tabs';
      // zunächst verborgen; ui-build.css kümmert sich um Position
      t.style.display = 'none';
      document.body.appendChild(t);
    }
    t.innerHTML = CATS.map(function(c,i){
      return '<button type="button" data-tab="'+c.id+'" class="'+(i===0?'active':'')+'">'+c.label+'</button>';
    }).join('');
    ui.tabs = t;

    // Tab-Clicks
    $all('#build-tabs [data-tab]').forEach(function(tb,idx){
      on(tb,'click', function(){
        $all('#build-tabs [data-tab].active').forEach(function(b){b.classList.remove('active');});
        tb.classList.add('active');
        renderCat(tb.getAttribute('data-tab'));
      });
      if (idx===0) ui.activeCat = tb.getAttribute('data-tab');
    });
  }

  function ensureDock(){
    var d = $('#build-dock');
    if (!d){
      d = document.createElement('nav');
      d.id = 'build-dock';
      // zunächst verborgen
      d.style.display = 'none';
      document.body.appendChild(d);
    }
    ui.dock = d;
  }

  function renderCat(catId){
    ui.activeCat = catId || ui.activeCat || (CATS[0] && CATS[0].id);
    var cat = CATS.filter(function(c){return c.id===ui.activeCat;})[0] || CATS[0];
    if (!cat) return;

    ui.dock.innerHTML = cat.items.map(function(it){
      var icon = it.icon || '🏗️';
      var thumb = it.thumb ? '<span class="thumb" style="background-image:url('+it.thumb+')"></span>' : '';
      if (it.key){
        return '<button data-tool="build" data-key="'+it.key+'" title="'+(it.label||it.key)+'">'+thumb+(thumb?'':' '+icon+' ')+(it.label||it.key)+'</button>';
      } else {
        return '<button data-tool="'+it.tool+'" title="'+(it.label||it.tool)+'">'+icon+' '+(it.label||it.tool)+'</button>';
      }
    }).join('');

    // Button-Binds
    $all('#build-dock [data-tool]').forEach(function(btn){
      on(btn,'click', function(){
        var t = btn.getAttribute('data-tool');
        var k = btn.getAttribute('data-key');

        // Toggle innerhalb der Liste: aktiven Button markieren
        $all('#build-dock [data-tool].active').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');

        if (t==='build' && k){
          if (window.Game && Game.setTool) Game.setTool('build', {key:k});
          ok('[ok] Tool gesetzt:', k);
        } else {
          if (t==='none'){ if (window.Game && Game.clearTool) Game.clearTool(); }
          else if (window.Game && Game.setTool){ Game.setTool(t||null); }
          ok('[ok] Tool gesetzt:', t);
        }
        // Menü optional schließen? (Mobile UX)
        // close();
      });
    });
  }

  function open(){
    if (ui.visible) return;
    if (!ui.tabs || !ui.dock) { ensureTabs(); ensureDock(); }
    ui.tabs.style.display = '';
    ui.dock.style.display = '';
    // initiale Kategorie gerendert?
    if (!ui.dock.innerHTML) renderCat(ui.activeCat);
    ui.visible = true;
    ok('[ok] Bau-Menü geöffnet (ui-build.js '+VERSION+')');
  }
  function close(){
    if (!ui.visible) return;
    ui.tabs.style.display = 'none';
    ui.dock.style.display = 'none';
    ui.visible = false;
    ok('[ok] Bau-Menü geschlossen');
    // aktiven UI-Button (Liste) entmarkieren
    $all('#build-dock [data-tool].active').forEach(function(b){ b.classList.remove('active'); });
    // aktives Tool optional zurücksetzen? (nein, User entscheidet)
  }
  function toggle(){ ui.visible ? close() : open(); }

  // Game → UI Hook (wenn Tool gecleart wurde)
  if (!window.GameUI) window.GameUI = {};
  window.GameUI.onToolCleared = function(){
    $all('#build-dock [data-tool].active').forEach(function(b){ b.classList.remove('active'); });
  };
  // Öffnen/Schließen als API
  window.GameUI.openBuildMenu = open;
  window.GameUI.closeBuildMenu = close;
  window.GameUI.toggleBuildMenu = toggle;

  function init(){
    ensureButton();
    ensureTabs();
    ensureDock();

    // WICHTIG: Menü bleibt geschlossen – kein Auto-Open!
    // Falls du Auto-Open später willst: window.addEventListener('cb:game-started', open);

    ok('[ok] Bau-Menü bereit (ui-build.js '+VERSION+')');
  }

  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }

})();
