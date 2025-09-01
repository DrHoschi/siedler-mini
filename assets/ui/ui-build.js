/*! ui-build.js — City Builder Build UI (v16.3.5)
    - FAB links unten öffnet/schließt das Bau-Menü
    - UI ist fixed overlay (zoomt NICHT mit)
    - FABs verschieben sich automatisch, wenn das Menü offen ist
*/
(function(){
  'use strict';
  var VERSION = 'v16.3.5';

  // --- tiny logger wrapper ---------------------------------------------------
  var L = (function(){
    var api = { ok:log, warn:warn, err:err };
    function log(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }
    function warn(){ (window.CBLog && CBLog.warn ? CBLog.warn : console.warn).apply(console, arguments); }
    function err(){ (window.CBLog && CBLog.err ? CBLog.err : console.error).apply(console, arguments); }
    return api;
  })();

  // --- DOM helpers -----------------------------------------------------------
  function $el(tag, cls, html){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html!=null) n.innerHTML = html;
    return n;
  }
  function stopAll(e){
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }
    return false;
  }

  // --- state -----------------------------------------------------------------
  var UI = {
    root: null,
    bar: null,
    fab: null,
    open: false,
    built: false
  };

  // --- building config (leichtgewichtig; Namen müssen zu Game.setTool passen)-
  // Kategorien + Einträge
  var CATS = [
    { key:'home',  title:'Wohnen', items:[
      {key:'house0', label:'Haus I',  emoji:'🏠'},
      {key:'house1', label:'Haus II', emoji:'🏘️'}
    ]},
    { key:'prod',  title:'Produktion', items:[
      {key:'lumberjack', label:'Holzfäller', emoji:'🪓'},
      {key:'farm',       label:'Farm',       emoji:'🌾'},
      {key:'mill',       label:'Mühle',      emoji:'🌬️'}
    ]},
    { key:'store', title:'Lager', items:[
      {key:'depot', label:'Depot', emoji:'📦'}
    ]},
    { key:'road',  title:'Wege', items:[
      {key:'road', label:'Straße', emoji:'🛣️'}
    ]},
    { key:'tools', title:'Tools', items:[
      {key:'bulldozer', label:'Abriss', emoji:'❌'}
    ]}
  ];

  // --- build UI once ---------------------------------------------------------
  function buildUI(){
    if (UI.built) return;
    UI.built = true;

    // Root container (fixed, pointer-safe, NICHT zoombar)
    var root = $el('div','cb-build-root');
    root.setAttribute('aria-live','polite');
    root.addEventListener('click', function(e){ /* nichts nach unten durchreichen */ stopAll(e); }, {passive:false});
    root.addEventListener('wheel', stopAll, {passive:false});
    root.addEventListener('touchstart', stopAll, {passive:false});
    root.addEventListener('touchmove', stopAll, {passive:false});

    // Build bar (unten)
    var bar = $el('div','cb-build-bar');
    var tabs = $el('div','cb-build-tabs');
    var list = $el('div','cb-build-list');
    bar.appendChild(tabs);
    bar.appendChild(list);

    // Tabs
    CATS.forEach(function(cat, idx){
      var b = $el('button','cb-tab'+(idx===0?' active':''), cat.title);
      b.dataset.cat = cat.key;
      b.addEventListener('click', function(){
        tabs.querySelectorAll('button').forEach(function(t){ t.classList.toggle('active', t===b); });
        renderList(cat.key);
      });
      tabs.appendChild(b);
    });

    // List
    function renderList(catKey){
      var cat = CATS.find(function(c){return c.key===catKey;}) || CATS[0];
      list.innerHTML = '';
      cat.items.forEach(function(it){
        var btn = $el('button','cb-item','<span class="cb-emoji">'+(it.emoji||'🏗️')+'</span><span>'+it.label+'</span>');
        btn.dataset.key = it.key;
        btn.addEventListener('click', function(ev){
          stopAll(ev);
          if (window.Game && typeof Game.setTool==='function'){
            if (it.key==='road' || it.key==='bulldozer'){
              Game.setTool(it.key);
            } else {
              Game.setTool('build', {key: it.key});
            }
            L.ok('[ok] Tool gesetzt:', it.key);
          }
        });
        list.appendChild(btn);
      });
    }
    renderList(CATS[0].key);

    // FAB (links unten)
    var fab = $el('button','cb-fab cb-fab-build','<span class="brick">🧱</span>');
    fab.title = 'Bau-Menü';
    fab.addEventListener('click', function(ev){
      stopAll(ev);
      toggle();
    }, {passive:false});

    root.appendChild(bar);
    root.appendChild(fab);
    document.body.appendChild(root);

    UI.root = root;
    UI.bar = bar;
    UI.fab = fab;

    // initial geschlossen
    setOpen(false);

    L.ok('[ok] Bau-Menü bereit (ui-build.js '+VERSION+')');
  }

  function setOpen(flag){
    UI.open = !!flag;
    if (!UI.root) return;
    UI.root.classList.toggle('open', UI.open);
    // FABs anheben/senken (Klasse wird von CSS verarbeitet)
    document.documentElement.classList.toggle('cb-build-open', UI.open);
  }
  function toggle(){ setOpen(!UI.open); }

  // --- public API ------------------------------------------------------------
  window.BuildUI = window.BuildUI || {};
  window.BuildUI.open = function(){ setOpen(true); };
  window.BuildUI.close = function(){ setOpen(false); };
  window.BuildUI.toggle = toggle;

  // --- lifecycle -------------------------------------------------------------
  // Auf Game-Start UI erzeugen (aber geschlossen lassen)
  window.addEventListener('cb:game-started', function(){ buildUI(); setOpen(false); });
  // Fallback: wenn UI früher gebraucht wird (z.B. manuell)
  window.addEventListener('DOMContentLoaded', function(){ /* nicht automatisch öffnen */ });

  // export version (optional)
  window.BuildUI.version = VERSION;

})();
