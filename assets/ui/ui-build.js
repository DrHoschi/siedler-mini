/* ui-build.js — v16.2.9  |  Siedler-Mini
 * - Bau-Menü wird erst nach Game-Start eingeblendet
 * - ES5, keine Module, hängt an window.GameUI
 */
(function () {
  'use strict';

  var VER = 'v16.2.9';
  var root = window;
  var d = document;

  // kleines Log-Shim (geht an CBLog, sonst console)
  function log()   { (root.CBLog && CBLog.ok   ? CBLog.ok   : console.log).apply(console, arguments); }
  function warn()  { (root.CBLog && CBLog.warn ? CBLog.warn : console.warn).apply(console, arguments); }
  function error() { (root.CBLog && CBLog.err  ? CBLog.err  : console.error).apply(console, arguments); }

  // ---------- DOM helpers
  function $(sel, ctx){ return (ctx||d).querySelector(sel); }
  function $all(sel, ctx){ return Array.prototype.slice.call((ctx||d).querySelectorAll(sel)); }
  function el(tag, cls, txt){
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (txt!=null) e.textContent = txt;
    return e;
  }

  // ---------- State
  var ui = {
    bar: null,
    tabs: null,
    list: null,
    visible: false,
    currentCat: 'house'
  };

  // Kategorien + Einträge (Icons/Keys müssen zu game.js passen)
  var CATS = [
    { id: 'house', title: 'Wohnen', items: [
      { key:'house0', title:'Haus I',  icon:'assets/tex/building/wood/haeuser_wood1.PNG' },
      { key:'house1', title:'Haus II', icon:'assets/tex/building/wood/haeuser_wood2.PNG' }
    ]},
    { id: 'prod', title: 'Produktion', items: [
      { key:'lumberjack', title:'Holzfäller', icon:'assets/tex/building/wood/lumberjack_wood.PNG' },
      { key:'farm',       title:'Farm',       icon:'assets/tex/building/wood/farm_wood.PNG' },
      { key:'mill',       title:'Mühle',      icon:'assets/tex/building/wood/windmuehle_wood.PNG' }
    ]},
    { id: 'store', title: 'Lager', items: [
      { key:'depot', title:'Depot', icon:'assets/tex/building/wood/depot_wood.PNG' }
    ]},
    { id: 'roads', title: 'Wege', items: [
      { tool:'road',      title:'Straße' },
      { tool:'path',      title:'Weg'    },
      { tool:'bulldozer', title:'Abreißen' }
    ]},
    { id: 'tools', title: 'Tools', items: [
      { tool:'none', title:'Auswahl aufheben' }
    ]}
  ];

  // ---------- Build Bar erstellen
  function createBar(){
    if (ui.bar) return ui.bar;

    var bar = el('div', 'buildbar');
    bar.setAttribute('data-ver', VER);
    bar.style.position = 'fixed';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.bottom = '0';
    bar.style.zIndex = '20';
    bar.style.padding = '8px 10px';
    bar.style.background = 'rgba(10,20,15,.45)';
    bar.style.backdropFilter = 'blur(8px)';
    bar.style.webkitBackdropFilter = 'blur(8px)';
    bar.style.transition = 'transform .22s ease';
    bar.style.transform = 'translateY(110%)';    // initial versteckt

    // Tabs
    var tabs = el('div', 'buildbar-tabs');
    tabs.style.display = 'flex';
    tabs.style.gap = '8px';
    tabs.style.margin = '0 0 10px 0';
    CATS.forEach(function(c){
      var t = el('button', 'bb-tab', c.title);
      t.type = 'button';
      t.dataset.cat = c.id;
      t.style.border = '0';
      t.style.borderRadius = '16px';
      t.style.padding = '8px 14px';
      t.style.opacity = '.85';
      t.style.background = 'rgba(18,30,24,.75)';
      t.style.color = '#d9ead7';
      t.onclick = function(){
        ui.currentCat = c.id;
        updateList();
        $all('.bb-tab', tabs).forEach(function(b){ b.classList.toggle('active', b===t); b.style.opacity = b===t ? '1' : '.85'; });
      };
      tabs.appendChild(t);
    });

    // Liste
    var list = el('div', 'buildbar-list');
    list.style.display = 'flex';
    list.style.gap = '12px';
    list.style.overflowX = 'auto';
    list.style.padding = '6px 2px 2px 2px';

    // Zusammenbauen
    bar.appendChild(tabs);
    bar.appendChild(list);
    d.body.appendChild(bar);

    ui.bar = bar; ui.tabs = tabs; ui.list = list;

    // Ersten Tab aktivieren
    setTimeout(function(){
      var first = $('.bb-tab', tabs); if (first) first.click();
    }, 0);

    log('[ok] Bau-Menü bereit (ui-build.js ' + VER + ')');
    return bar;
  }

  function updateList(){
    if (!ui.list) return;
    ui.list.innerHTML = '';
    var cat = CATS.filter(function(c){ return c.id===ui.currentCat; })[0];
    if (!cat) return;

    cat.items.forEach(function(it){
      var btn = el('button', 'bb-item');
      btn.type = 'button';
      btn.style.minWidth = '160px';
      btn.style.height = '64px';
      btn.style.border = '0';
      btn.style.borderRadius = '12px';
      btn.style.background = 'rgba(22,32,26,.9)';
      btn.style.color = '#e9f7e7';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'flex-start';
      btn.style.gap = '10px';
      btn.style.padding = '6px 10px';

      // Icon (klein halten)
      var icon = el('div');
      icon.style.width = '44px';
      icon.style.height = '44px';
      icon.style.borderRadius = '8px';
      icon.style.flex = '0 0 44px';
      icon.style.background = 'rgba(255,255,255,.08)';
      if (it.icon){
        icon.style.backgroundImage = 'url('+it.icon+')';
        icon.style.backgroundSize = 'cover';
        icon.style.backgroundPosition = 'center';
      }
      btn.appendChild(icon);

      var label = el('div', '', it.title || it.key || it.tool);
      label.style.fontWeight = '600';
      btn.appendChild(label);

      btn.onclick = function(){
        if (!root.Game || !root.Game.setTool){ warn('[ui-build] Game.setTool fehlt'); return; }
        if (it.key){
          root.Game.setTool('build', {key: it.key});
          log('[ok] Tool gesetzt:', it.key);
        } else if (it.tool) {
          if (it.tool === 'none'){
            root.Game.setTool(null, null);
          } else {
            root.Game.setTool(it.tool, null);
          }
          log('[ok] Tool gesetzt:', it.tool);
        }
        // Nach Auswahl das Menü kurz schließen (Mobile UX)
        hide();
      };

      ui.list.appendChild(btn);
    });
  }

  // ---------- Sichtbarkeit steuern
  function show(){
    if (!ui.bar) createBar();
    if (!ui.visible){
      ui.bar.style.transform = 'translateY(0)';
      ui.visible = true;
      log('[ok] Bau-Menü geöffnet (ui-build.js ' + VER + ')');
    }
  }
  function hide(){
    if (ui.bar && ui.visible){
      ui.bar.style.transform = 'translateY(110%)';
      ui.visible = false;
      log('[ok] Bau-Menü geschlossen');
    }
  }

  // ---------- Lifecycle: erst nach Game-Start zeigen
  function onGameStarted(){ show(); }
  function onUIReady(){ /* absichtlich leer: Menü bleibt bis Start verborgen */ }

  // Events
  window.addEventListener('cb:ui-ready', onUIReady);
  window.addEventListener('cb:game-started', onGameStarted);

  // ---------- Public API
  var API = (root.GameUI = root.GameUI || {});
  API.openBuildMenu  = show;
  API.closeBuildMenu = hide;

})();
