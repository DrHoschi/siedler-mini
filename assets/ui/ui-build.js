// ui-build.js — v16.3.6
// Minimalistisches, fixes Bau-Menü (Tabs + Items), öffnet per Button.
// - kein Auto-Open beim Game-Start
// - bleibt als eigene DOM-Ebene (position: fixed), zoomt nicht mit
// - ruft Game.setTool('build', {key}) für Gebäude auf
// - ruft Game.setTool('road'|'path'|'bulldozer') für Tools auf

(function(){
  'use strict';
  var VERSION = 'v16.3.6';

  // Logging
  function ok(){  (window.CBLog && CBLog.ok  ? CBLog.ok  : console.log).apply(console, arguments); }
  function warn(){(window.CBLog && CBLog.warn? CBLog.warn : console.warn).apply(console, arguments); }

  var Game = (window.Game || {});
  var api  = (window.BuildUI = window.BuildUI || {});
  var state = { root:null, tabs:null, panel:null, active:'wohnen', open:false };

  // ---------- Daten ----------
  var CATEGORIES = [
    { id:'wohnen',     label:'Wohnen' },
    { id:'produktion', label:'Produktion' },
    { id:'lager',      label:'Lager' },
    { id:'wege',       label:'Wege' },
    { id:'tools',      label:'Tools' },
  ];

  // Items: label, action: {build:'key'} ODER {tool:'road'|'path'|'bulldozer'}
  var ITEMS = {
    wohnen: [
      { id:'house1', label:'Haus I',  action:{build:'house1'} },
      { id:'house2', label:'Haus II', action:{build:'house2'} },
      { id:'townhall', label:'Rathaus', action:{build:'townhall'} },
    ],
    produktion: [
      { id:'lumberjack', label:'Holzfäller', action:{build:'lumberjack'} },
      { id:'farm',       label:'Farm',       action:{build:'farm'} },
      { id:'mill',       label:'Mühle',      action:{build:'mill'} },
    ],
    lager: [
      { id:'depot', label:'Depot', action:{build:'depot'} },
    ],
    wege: [
      { id:'road', label:'Straße', action:{tool:'road'} },
      { id:'path', label:'Weg',    action:{tool:'path'} },
    ],
    tools: [
      { id:'bulldozer', label:'Abriss', action:{tool:'bulldozer'} },
      { id:'cancel',    label:'Abbrechen', action:{tool:'cancel'} },
    ],
  };

  // ---------- DOM ----------
  function ensureRoot(){
    if (state.root) return state.root;
    var root = document.createElement('div');
    root.id = 'build-dock';
    root.className = 'build-dock';
    root.setAttribute('data-version', VERSION);
    // fixe UI-Ebene
    root.style.position = 'fixed';
    root.style.left = '0';
    root.style.right = '0';
    root.style.bottom = '0';
    root.style.zIndex = '2147483638';
    root.style.pointerEvents = 'none'; // Layout trägt, Buttons selbst aktivieren pointerEvents

    // Tabs
    var tabs = document.createElement('div');
    tabs.className = 'build-tabs';
    tabs.style.pointerEvents = 'auto';
    root.appendChild(tabs);

    // Panel mit Items
    var panel = document.createElement('div');
    panel.className = 'build-panel';
    panel.style.pointerEvents = 'auto';
    root.appendChild(panel);

    document.body.appendChild(root);
    state.root = root; state.tabs = tabs; state.panel = panel;
    return root;
  }

  function renderTabs(){
    var tabs = state.tabs; tabs.innerHTML = '';
    CATEGORIES.forEach(function(c){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab' + (state.active===c.id ? ' active':'');
      b.textContent = c.label;
      b.onclick = function(){
        state.active = c.id;
        renderTabs(); renderItems();
      };
      tabs.appendChild(b);
    });
  }

  function renderItems(){
    var panel = state.panel; panel.innerHTML = '';
    var arr = ITEMS[state.active] || [];
    if (!arr.length){
      var em = document.createElement('div');
      em.className = 'empty';
      em.textContent = '— keine Elemente —';
      panel.appendChild(em);
      return;
    }

    arr.forEach(function(it){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'item';
      b.textContent = it.label;
      b.onclick = function(){
        if (it.action.build){
          if (Game && typeof Game.setTool === 'function'){
            Game.setTool('build', {key: it.action.build});
            ok('[ok] Tool gesetzt: build', it.action.build);
          }
        } else if (it.action.tool){
          if (it.action.tool === 'cancel'){
            if (Game && Game.setTool){ Game.setTool(null); ok('[ok] Tool zurückgesetzt'); }
          } else if (Game && Game.setTool){
            Game.setTool(it.action.tool);
            ok('[ok] Tool gesetzt:', it.action.tool);
          }
        }
      };
      panel.appendChild(b);
    });
  }

  // ---------- Public API ----------
  api.init = function(){
    ensureRoot();
    renderTabs();
    renderItems();
    ok('[ok] Bau-Menü bereit (ui-build.js '+VERSION+')');
  };

  api.open = function(){
    ensureRoot();
    state.root.style.display = '';
    state.open = true;
    return true;
  };

  api.close = function(){
    if (!state.root) return false;
    state.root.style.display = 'none';
    state.open = false;
    return false;
  };

  api.toggle = function(){
    if (!state.root || state.root.style.display === 'none'){
      return api.open();
    } else {
      return api.close();
    }
  };

  // nicht automatisch initialisieren – Bridge macht das nach game-start
})();
