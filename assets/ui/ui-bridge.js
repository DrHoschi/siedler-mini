// ui-bridge.js — v16.3.6
// Verbindet Startpanel, Build-Bar und Inspector + FAB-Buttons.
// - Build-Bar ist nach Game-Start geschlossen
// - FABs werden sichtbar, springen bei offenem Menü höher (nicht vom Kartenzoom betroffen)
// - Inspector öffnet/schließt nur per Button
(function(){
  'use strict';
  var VER = 'v16.3.6';

  // Log Helper (nutzt Inspector wenn vorhanden)
  function log(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }

  var $ = function(q){ return document.querySelector(q); };
  var buildBarEl = null;
  var fabBuild = null, fabInspector = null;

  // Exponierte, einfache Bridge-API
  var Bridge = (window.UIBridge = window.UIBridge || {});
  Bridge.openBuildBar  = function(){ ensureBuildBar(); openBuild(true); };
  Bridge.closeBuildBar = function(){ ensureBuildBar(); openBuild(false); };
  Bridge.toggleBuildBar= function(){ ensureBuildBar(); openBuild(!buildBarEl.classList.contains('open')); };

  function ensureBuildBar(){
    if (buildBarEl) return;
    buildBarEl = document.getElementById('cb-buildbar') || createBuildBarPlaceholder();
  }

  // Falls ui-build.js den Container selbst erzeugt, fassen wir nur Klassen an.
  function createBuildBarPlaceholder(){
    var el = document.createElement('div');
    el.id = 'cb-buildbar';
    document.body.appendChild(el);
    return el;
  }

  function setFabsRaised(raised){
    [fabBuild, fabInspector].forEach(function(btn){
      if (!btn) return;
      btn.classList.toggle('fab--raised', !!raised);
    });
  }

  function openBuild(on){
    if (!buildBarEl) return;
    buildBarEl.classList.toggle('open', !!on);
    setFabsRaised(!!on);
    // dem Baumenü sagen, dass es sichtbar ist (damit aktive States gesetzt werden können)
    if (window.GameUI && typeof GameUI.onBuildVisibility==='function'){
      try { GameUI.onBuildVisibility(!!on); } catch(_){}
    }
  }

  function initFabs(){
    fabBuild = $('#fab-build');
    fabInspector = $('#fab-inspector');

    if (fabBuild){
      fabBuild.addEventListener('click', function(e){
        e.preventDefault();
        Bridge.toggleBuildBar();
      }, {passive:true});
    }
    if (fabInspector){
      fabInspector.addEventListener('click', function(e){
        e.preventDefault();
        // Inspector-API: toggle()
        if (window.Inspector && typeof Inspector.toggle==='function'){
          Inspector.toggle();
        }else{
          // Fallback: Element sichtbar schalten
          var p = document.getElementById('cb-inspector');
          if (p) p.classList.toggle('minimized');
        }
      }, {passive:true});
    }
  }

  // UI erst zeigen, wenn das Spiel wirklich läuft
  window.addEventListener('cb:game-started', function(){
    ensureBuildBar();
    openBuild(false); // geschlossen starten
    // FABs einblenden
    [fabBuild, fabInspector].forEach(function(btn){
      if (btn) btn.classList.remove('fab--hide');
    });
    log('[ui-bridge] bereit ('+VER+')');
  });

  // Wenn ui-build.js sein DOM fertig hat, preferiere dessen Container
  window.addEventListener('cb:buildbar-ready', function(e){
    var el = e && e.detail && e.detail.el;
    if (el && el.id === 'cb-buildbar') buildBarEl = el;
  });

  // Beim Start direkt Buttons initialisieren (noch unsichtbar bis game-started)
  document.addEventListener('DOMContentLoaded', initFabs, {once:true});
})();
