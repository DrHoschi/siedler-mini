// assets/ui/ui-build.js — v16.3.4
(function () {
  'use strict';

  var VERSION = 'v16.3.4';

  // Logging-Helfer (nutzt CBLog wenn vorhanden)
  function ok(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }
  function warn(){ (window.CBLog && CBLog.warn ? CBLog.warn : console.warn).apply(console, arguments); }
  function err(){ (window.CBLog && CBLog.err ? CBLog.err : console.error).apply(console, arguments); }

  // Namespaces
  var GameUI = (window.GameUI = window.GameUI || {});
  var Game   = (window.Game   = window.Game   || {});

  // DOM-Refs / State
  var root    = null;     // <div id="cb-build">
  var bar     = null;     // Button-Bar mit Tabs/Items
  var tabsBar = null;     // Tabs-Leiste
  var itemsBar= null;     // Item-Leiste
  var toggleBtn = null;   // Schwebe-Button links unten
  var currentTab = 'wohnen';
  var ready = false;
  var opened = false;

  // Konfiguration der Kategorien & Items
  // key == Game-Building-Key, tool == direkte Tools (road / path / bulldozer)
  var CATS = [
    { id:'wohnen',    label:'Wohnen',    items:[
      {type:'build',key:'house0', label:'Haus I', icon:'🏠'},
      {type:'build',key:'house1', label:'Haus II',icon:'🏘️'},
      {type:'build',key:'townhall', label:'Rathaus', icon:'🏰'}
    ]},
    { id:'produktion',label:'Produktion',items:[
      {type:'build',key:'lumberjack', label:'Holzfäller', icon:'🪓'},
      {type:'build',key:'farm',       label:'Farm',       icon:'🌾'},
      {type:'build',key:'mill',       label:'Mühle',      icon:'🌬️'}
    ]},
    { id:'lager',     label:'Lager',     items:[
      {type:'build',key:'depot', label:'Depot', icon:'📦'}
    ]},
    { id:'wege',      label:'Wege',      items:[
      {type:'tool', tool:'road', label:'Straße', icon:'🛣️'}
      // {type:'tool', tool:'path', label:'Weg', icon:'🚶'} // optional
    ]},
    { id:'tools',     label:'Tools',     items:[
      {type:'tool', tool:'bulldozer', label:'Abriss', icon:'❌'}
    ]}
  ];

  // Public API ---------------------------------------------------------------

  GameUI.openBuildMenu = function(){
    if (!ready) return;
    root.classList.remove('cb-build--hidden');
    opened = true;
    if (toggleBtn) toggleBtn.classList.add('active');
  };

  GameUI.closeBuildMenu = function(){
    if (!ready) return;
    root.classList.add('cb-build--hidden');
    opened = false;
    if (toggleBtn) toggleBtn.classList.remove('active');
    // aktives Build-Tool beim Schließen zurücksetzen
    if (Game && typeof Game.setTool === 'function') {
      Game.setTool(null);
    }
  };

  GameUI.toggleBuildMenu = function(){
    if (!ready) return;
    if (opened) GameUI.closeBuildMenu();
    else GameUI.openBuildMenu();
  };

  GameUI.isBuildMenuOpen = function(){
    return !!opened;
  };

  // Setzt das Tool und spiegelt Status in der UI
  GameUI.setTool = function(mode, payload){
    try {
      if (Game && typeof Game.setTool === 'function') {
        Game.setTool(mode, payload);
      } else {
        warn('[ui-build] Game.setTool nicht vorhanden.');
      }
      // UI-Highlight aktualisieren
      highlightActive(mode, payload);
    } catch(e){
      err('[ui-build] setTool Fehler:', e && e.message ? e.message : e);
    }
  };

  // Internes Rendering -------------------------------------------------------

  function buildDOM(){
    // Root
    root = document.createElement('div');
    root.id = 'cb-build';
    root.className = 'cb-build cb-build--hidden'; // Start: versteckt
    root.setAttribute('data-version', VERSION);

    // Innere Struktur
    var wrap = document.createElement('div');
    wrap.className = 'cb-build__wrap';

    // Tabs
    tabsBar = document.createElement('div');
    tabsBar.className = 'cb-build__tabs';

    // Items
    itemsBar = document.createElement('div');
    itemsBar.className = 'cb-build__items';

    wrap.appendChild(tabsBar);
    wrap.appendChild(itemsBar);
    root.appendChild(wrap);

    // Toggle-Button (links unten)
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'cb-build-toggle';
    toggleBtn.className = 'cb-build__toggle';
    toggleBtn.title = 'Bau-Menü ein/aus';
    // kleines Ziegel/Block-Emoji als Default
    toggleBtn.innerHTML = '<span class="cb-ico">🧱</span>';

    // DOM anhängen
    document.body.appendChild(root);
    document.body.appendChild(toggleBtn);

    // Events
    toggleBtn.addEventListener('click', function(e){
      e.preventDefault();
      GameUI.toggleBuildMenu();
    });

    // ESC schließt Menü
    window.addEventListener('keydown', function(e){
      if ((e.key||'').toLowerCase() === 'escape' && opened) {
        GameUI.closeBuildMenu();
      }
    });

    // Tabs rendern
    renderTabs();
    // Items der Start-Kategorie
    switchTab(currentTab);

    ready = true;
  }

  function renderTabs(){
    tabsBar.innerHTML = '';
    CATS.forEach(function(cat){
      var b = document.createElement('button');
      b.className = 'cb-tab';
      b.setAttribute('data-tab', cat.id);
      b.textContent = cat.label;
      if (cat.id === currentTab) b.classList.add('active');
      b.addEventListener('click', function(){
        switchTab(cat.id);
      });
      tabsBar.appendChild(b);
    });
  }

  function switchTab(id){
    currentTab = id;
    // Tab Active-Markierung
    var all = tabsBar.querySelectorAll('.cb-tab');
    for (var i=0;i<all.length;i++){
      var el = all[i];
      if (el.getAttribute('data-tab') === id) el.classList.add('active');
      else el.classList.remove('active');
    }
    // Items rendern
    renderItems(CATS.find(function(c){return c.id===id; }));
  }

  function renderItems(cat){
    itemsBar.innerHTML = '';
    if (!cat) return;
    cat.items.forEach(function(it){
      var btn = document.createElement('button');
      btn.className = 'cb-item';
      btn.setAttribute('data-type', it.type);
      var label = (it.icon ? (it.icon + ' ') : '') + it.label;

      if (it.type === 'build'){
        btn.setAttribute('data-key', it.key);
        btn.innerHTML = label;
        btn.addEventListener('click', function(){
          GameUI.setTool('build', { key: it.key });
          // beim Auswählen geöffnet lassen – Nutzer platziert danach auf der Karte
        });
      } else if (it.type === 'tool'){
        btn.setAttribute('data-tool', it.tool);
        btn.innerHTML = label;
        btn.addEventListener('click', function(){
          GameUI.setTool(it.tool);
        });
      }
      itemsBar.appendChild(btn);
    });
    // Nach dem (Neu-)Rendern aktives Tool hervorheben
    highlightActive();
  }

  function highlightActive(mode, payload){
    // Alles zurücksetzen
    var all = itemsBar.querySelectorAll('.cb-item');
    for (var i=0;i<all.length;i++) all[i].classList.remove('active');

    // Aktuell gesetztes Tool/Building markieren
    // Wir fragen Game.toolState ab, falls bereitgestellt — fallback: letzte Aufruf-Args
    var activeMode = mode;
    var activeKey  = payload && payload.key;

    try {
      if ((!activeMode) && Game && Game.toolState) {
        activeMode = Game.toolState.mode;
        activeKey  = Game.toolState.key;
      }
    } catch(_){}

    if (!activeMode) return;

    var selector = '';
    if (activeMode === 'build' && activeKey){
      selector = '.cb-item[data-type="build"][data-key="'+activeKey+'"]';
    } else {
      selector = '.cb-item[data-type="tool"][data-tool="'+activeMode+'"]';
    }
    var el = itemsBar.querySelector(selector);
    if (el) el.classList.add('active');
  }

  // Lifecycle / Boot ---------------------------------------------------------

  function onGameStarted(){
    // Beim Spielstart bleibt das Menü ZU
    GameUI.closeBuildMenu();
    // Button sichtbar lassen
    if (toggleBtn) toggleBtn.style.display = '';
    ok('[ok] Bau-Menü bereit (ui-build.js '+VERSION+')');
  }

  function ensure(){
    if (ready) return;
    buildDOM();
  }

  // Init jetzt – aber noch nicht öffnen
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ensure);
  } else {
    ensure();
  }

  // Auf Game-Start reagieren
  window.addEventListener('cb:game-started', onGameStarted);

  // Auch auf Fenstergröße reagieren, falls CSS damit arbeitet (keine Pflicht)
  window.addEventListener('resize', function(){
    // keine spezielle Logik nötig; CSS ist responsiv
  });

  ok('[ui-build] Modul geladen ('+VERSION+')');
})();
