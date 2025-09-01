// assets/ui/ui-build.js — v16.3.5
(function () {
  'use strict';

  var VERSION = 'v16.3.5';
  var root, bar, tabs, grid, isOpen = false, currentCat = 'Wohnen';

  // --- Logging helper (geht auch ohne Inspector) ---
  function ok(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }
  function warn(){ (window.CBLog && CBLog.warn ? CBLog.warn : console.warn).apply(console, arguments); }

  // --- FAB-/Layout-Helfer ---
  function setFabLift(px){
    document.documentElement.style.setProperty('--bm-lift', (px|0) + 'px');
  }
  function recomputeLift(){
    if (!bar) return;
    var r = bar.getBoundingClientRect();
    // etwas Luft addieren, damit die FABs nicht genau am Rand kleben
    setFabLift(isOpen ? (Math.ceil(r.height) + 12) : 0);
    document.body.classList.toggle('buildmenu-open', !!isOpen);
  }

  function ensureFabGuards(){
    // Verhindert „Geister-FABs“: existieren ID-basierte FABs schon, wird nichts doppelt angelegt.
    // (Die echten FABs entstehen in ui-bridge.js; hier nur die Schutzmaßnahme)
    ['fab-build','fab-inspector'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.setAttribute('data-ui-guard','1');
    });
  }

  // --- API nach außen ---
  var API = (window.GameUI = window.GameUI || {});
  API.toggleBuildMenu = function(force){
    var target = (typeof force === 'boolean') ? force : !isOpen;
    if (target === isOpen) return;
    isOpen = target;
    bar.style.display = isOpen ? 'block' : 'none';
    recomputeLift();
    ok('[ui-build] '+(isOpen?'geöffnet':'geschlossen')+' (v'+VERSION+')');
  };
  API.openBuildMenu   = function(){ API.toggleBuildMenu(true); };
  API.closeBuildMenu  = function(){ API.toggleBuildMenu(false); };
  API.onGameStarted   = function(){ /* NICHT auto-öffnen */ };

  // --- UI aufbauen ---
  function makeButton(label, onClick, extra){
    var b = document.createElement('button');
    b.className = 'bm-btn';
    b.textContent = label;
    if (extra) Object.keys(extra).forEach(function(k){ b.dataset[k]=extra[k]; });
    b.addEventListener('click', onClick);
    return b;
  }

  function fillCategory(cat){
    currentCat = cat;
    grid.innerHTML = '';

    function addBuild(key, title){
      var btn = makeButton(title, function(){
        if (window.Game && typeof Game.setTool==='function'){
          Game.setTool('build', {key:key});
          ok('[ui-build] Tool gesetzt:', key);
          // Menü automatisch wieder schließen, damit der Spieler direkt platziert
          API.closeBuildMenu();
        }
      }, {tool:'build', key:key});
      grid.appendChild(btn);
    }

    function addTool(mode, title){
      var btn = makeButton(title, function(){
        if (window.Game && typeof Game.setTool==='function'){
          Game.setTool(mode);
          ok('[ui-build] Tool gesetzt:', mode);
          API.closeBuildMenu();
        }
      }, {tool:mode});
      grid.appendChild(btn);
    }

    if (cat === 'Wohnen'){
      addBuild('house0','Haus I');
      addBuild('house1','Haus II');
      addBuild('townhall','Rathaus');
    } else if (cat === 'Produktion'){
      addBuild('lumberjack','Holzfäller');
      addBuild('farm','Farm');
      addBuild('mill','Mühle');
      addBuild('smith','Schmied');
      addBuild('stonecutter','Steinmetz');
      addBuild('watchtower','Wachturm');
      addBuild('bakery','Bäckerei');
    } else if (cat === 'Lager'){
      addBuild('depot','Depot');
    } else if (cat === 'Wege'){
      addTool('road','Straße');
      addTool('path','Weg');
      addTool('bulldozer','Abriss');
    } else if (cat === 'Tools'){
      var btn = makeButton('Tool zurücksetzen', function(){
        if (window.Game && typeof Game.setTool==='function'){ Game.setTool(null); }
        ok('[ui-build] Tool zurückgesetzt');
        API.closeBuildMenu();
      });
      grid.appendChild(btn);
    }
  }

  function buildUI(){
    root = document.getElementById('ui-build');
    if (!root){
      root = document.createElement('div'); root.id = 'ui-build';
      document.body.appendChild(root);
    }
    root.innerHTML = (
      '<div class="bm-bar" id="bm-bar">'+
        '<div class="bm-tabs" id="bm-tabs">'+
          '<button data-cat="Wohnen" class="tab active">Wohnen</button>'+
          '<button data-cat="Produktion" class="tab">Produktion</button>'+
          '<button data-cat="Lager" class="tab">Lager</button>'+
          '<button data-cat="Wege" class="tab">Wege</button>'+
          '<button data-cat="Tools" class="tab">Tools</button>'+
        '</div>'+
        '<div class="bm-grid" id="bm-grid"></div>'+
      '</div>'
    );

    bar  = document.getElementById('bm-bar');
    tabs = document.getElementById('bm-tabs');
    grid = document.getElementById('bm-grid');

    tabs.addEventListener('click', function(e){
      var t = e.target.closest('button[data-cat]');
      if (!t) return;
      tabs.querySelectorAll('.tab').forEach(function(b){ b.classList.remove('active'); });
      t.classList.add('active');
      fillCategory(t.dataset.cat);
      recomputeLift();
    });

    // Startzustand: geschlossen
    isOpen = false;
    bar.style.display = 'none';
    fillCategory('Wohnen');
    recomputeLift();
    ensureFabGuards();
    ok('[ui-build] Modul geladen (v'+VERSION+')');
  }

  // Events
  window.addEventListener('resize', recomputeLift);
  window.addEventListener('cb:game-started', function(){ API.onGameStarted(); });

  // init asap
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
