<script>
/* assets/ui/ui-build.js — v16.3.1
   Bau-Menü: startet versteckt, Toggle unten links, ruft Game.setTool(...) */

(function(){
  'use strict';

  var VERSION = 'v16.3.1';
  var root, bar, toggleBtn, isOpen = false;

  // kleine Log-Helfer (landet im Inspector)
  function log(){ (window.CBLog && CBLog.ok ? CBLog.ok:console.log)('[ok] Bau-Menü', Array.prototype.slice.call(arguments).join(' ')); }
  function warn(){ (window.CBLog && CBLog.warn ? CBLog.warn:console.warn)('[warn] Bau-Menü', Array.prototype.slice.call(arguments).join(' ')); }

  // Button-Fabrik
  function mkBtn(label, opts){
    var b = document.createElement('button');
    b.className = 'uib-btn';
    b.type = 'button';
    if (opts && opts.title) b.title = opts.title;
    b.innerHTML = label;
    if (opts && opts.on) b.addEventListener('click', opts.on);
    return b;
  }

  // Sichtbarkeit
  function renderVisibility(){
    if (!root) return;
    root.style.display = isOpen ? 'block':'none';
    if (toggleBtn){
      toggleBtn.setAttribute('aria-pressed', isOpen?'true':'false');
      toggleBtn.classList.toggle('active', isOpen);
    }
  }

  // API
  var API = {
    version: VERSION,
    open: function(){ isOpen = true; renderVisibility(); log('geöffnet (ui-build.js', VERSION+')'); },
    close: function(){ isOpen = false; renderVisibility(); log('geschlossen'); },
    toggle: function(){ isOpen = !isOpen; renderVisibility(); },
    init: function(){
      if (root) return API; // schon gebaut

      // Container
      root = document.createElement('div');
      root.id = 'build-bar';
      root.className = 'build-bar';     // Styling kommt aus ui-build.css
      root.style.display = 'none';      // initial: versteckt

      // Buttonzeilen – wie im Screenshot
      var row = document.createElement('div'); row.className = 'uib-row';

      // — Gebäude:
      row.appendChild(mkBtn('🏰 Rathaus', {title:'Rathaus', on:function(){ setToolBuild('townhall'); }}));
      row.appendChild(mkBtn('🪓 Holzfäller', {title:'Holzfäller', on:function(){ setToolBuild('lumberjack'); }}));
      row.appendChild(mkBtn('🌾 Farm', {title:'Farm', on:function(){ setToolBuild('farm'); }}));
      // (Mühle ist im Code vorhanden – hier behalten wir die drei wie im UI-Screenshot)

      row.appendChild(mkBtn('📦 Depot', {title:'Depot', on:function(){ setToolBuild('depot'); }}));
      row.appendChild(mkBtn('🏠 Haus I', {title:'Haus I', on:function(){ setToolBuild('house0'); }}));
      row.appendChild(mkBtn('🏠 Haus II', {title:'Haus II', on:function(){ setToolBuild('house1'); }}));

      // — Tools:
      row.appendChild(mkBtn('🛣️ Straße', {title:'Straße', on:function(){ setToolDirect('road'); }}));
      row.appendChild(mkBtn('❌ Abriss', {title:'Abriss', on:function(){ setToolDirect('bulldozer'); }}));

      root.appendChild(row);
      document.body.appendChild(root);

      // Toggle unten links (Backstein)
      toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'build-toggle';
      toggleBtn.setAttribute('aria-label','Bau-Menü öffnen/schließen');
      toggleBtn.innerHTML = '🧱';
      toggleBtn.addEventListener('click', API.toggle);
      document.body.appendChild(toggleBtn);

      // Events aus dem Spiel:
      // — nach Game-Start bleibt das Menü geschlossen (wie gewünscht)
      window.addEventListener('cb:game-started', function(){ /* bewusst nichts auto-öffnen */ }, {passive:true});

      log('bereit (ui-build.js '+VERSION+')');
      return API;
    }
  };

  function setToolBuild(key){
    try{
      if (window.Game && typeof Game.setTool==='function'){
        Game.setTool('build', {key:key});
        log('Tool gesetzt: build/'+key);
      } else warn('Game.setTool nicht verfügbar');
    }catch(e){ warn('setToolBuild Fehler: '+e.message); }
  }
  function setToolDirect(name){
    try{
      if (window.Game && typeof Game.setTool==='function'){
        Game.setTool(name);
        log('Tool gesetzt: '+name);
      } else warn('Game.setTool nicht verfügbar');
    }catch(e){ warn('setToolDirect Fehler: '+e.message); }
  }

  // Auto-Init sobald DOM bereit
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ API.init(); });
  } else { API.init(); }

  // nach außen geben
  window.UIBuild = API;
})();
</script>
