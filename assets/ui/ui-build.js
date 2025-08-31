<script>
/* ui-build.js – produktiv – zeigt/verbirgt das Baumenü erst nach Start */
(function(){
  'use strict';
  var VERSION = 'v16.3.3';
  var log = (window.CBLog && CBLog.ok) ? function(){ CBLog.ok.apply(CBLog, arguments); } : console.log;

  var bar, fab;
  var current = { mode:null, key:null };

  // Hilfen
  function qs(s, r){ return (r||document).querySelector(s); }
  function qsa(s, r){ return [].slice.call((r||document).querySelectorAll(s)); }

  // --- API so dass ui-start & game.js schalten können ----------------
  var API = (window.GameUI = window.GameUI || {});
  API.openBuild = function(){ if (bar) bar.classList.add('show'); if (fab) fab.classList.add('show'); };
  API.closeBuild = function(){ if (bar) bar.classList.remove('show'); };
  API.toggleBuild = function(){ if (!bar) return; bar.classList.toggle('show'); };

  // Tool setzen (ruft Game.setTool falls vorhanden)
  function setTool(mode, key){
    current.mode = mode; current.key = key || null;
    if (window.Game && typeof Game.setTool === 'function'){
      Game.setTool(mode, key ? {key:key} : null);
    }
    // Buttons markieren
    qsa('#buildBar button').forEach(function(b){ b.classList.remove('active'); });
    var sel = '#buildBar button[data-mode="'+mode+'"]' + (key? '[data-key="'+key+'"]':'');
    var btn = qs(sel); if (btn) btn.classList.add('active');
    log('[ok] Tool gesetzt:', key||mode);
  }

  // Buttons erzeugen (deine aktuelle Auswahl)
  var groups = [
    { label:'Bauen', items:[
      {t:'🏛️ Rathaus',    mode:'build', key:'townhall'},
      {t:'🪓 Holzfäller',  mode:'build', key:'lumberjack'},
      {t:'🌾 Farm',        mode:'build', key:'farm'},
      {t:'📦 Depot',       mode:'build', key:'depot'},
      {t:'🏠 Haus I',      mode:'build', key:'house0'},
      {t:'🏠 Haus II',     mode:'build', key:'house1'},
      {t:'🧱 Straße',      mode:'road'},
      {t:'❌ Abriss',      cls:'danger', mode:'bulldozer'}
    ]}
  ];

  function makeBar(){
    if (bar) return;
    bar = document.createElement('div');
    bar.id = 'buildBar';
    var row = document.createElement('div'); row.className='row';
    groups[0].items.forEach(function(it){
      var b = document.createElement('button');
      b.textContent = it.t;
      if (it.cls) b.classList.add(it.cls);
      b.dataset.mode = it.mode;
      if (it.key) b.dataset.key = it.key;
      b.addEventListener('click', function(){
        if (it.mode==='build') setTool('build', it.key);
        else setTool(it.mode);
      });
      row.appendChild(b);
    });
    bar.appendChild(row);
    document.body.appendChild(bar);
  }

  // Floating Action Button links unten
  function makeFab(){
    if (fab) return;
    fab = document.createElement('button');
    fab.id = 'buildFab';
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18.37-10.88a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    fab.addEventListener('click', API.toggleBuild);
    document.body.appendChild(fab);
  }

  // Events aus dem Game/Boot
  function onGameStarted(){
    makeBar(); makeFab();
    API.openBuild();                 // ab Game-Start sichtbar
    setTool('road');                 // Start-Tool (gerne ändern)
  }
  function onGameEnding(){
    API.closeBuild();
    if (fab) fab.classList.remove('show');
    current.mode=null; current.key=null;
  }

  // Hook Events
  window.addEventListener('cb:game-started', onGameStarted);
  window.addEventListener('cb:game-ending', onGameEnding);

  // UI fertig – aber NICHT automatisch öffnen (bis Spiel startet)
  window.addEventListener('cb:ui-ready', function(){
    makeBar(); makeFab();
    API.closeBuild();
    if (fab) fab.classList.remove('show');
    log('[ok] Bau-Menü bereit (ui-build.js '+VERSION+')');
  });

})();
</script>
