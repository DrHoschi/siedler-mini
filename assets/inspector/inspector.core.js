/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.10.6
 *
 * Zweck:
 *  - Kern-Overlay + Tabs (Übersicht/Logs/Build/Pfade/Tests)
 *  - Öffnen/Schließen/Toggle via __INSPECTOR_API__ und GameUI-Bridge
 *  - Fallback-Sichtbarkeit & minimale Statusmeldungen
 *  - Startet LogStream automatisch, sobald Logs-Tab angezeigt wird
 *
 * Abhängigkeiten:
 *  - cblog.polyfill.js (muss zuerst geladen sein)
 *  - optionale Module: inspector.logs.js / inspector.build.js / inspector.paths.js / inspector.tests.js
 * ========================================================================== */
(function () {
  'use strict';

  var MOD = '[inspector.core]';
  var VER = 'v18.10.6';

  // sanfte Logger
  function ok()  { try{ (window.CBLog?.ok   || console.log).apply(console, arguments);}catch(_){ console.log.apply(console, arguments);} }
  function info(){ try{ (window.CBLog?.info || console.log).apply(console, arguments);}catch(_){ console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn || console.warn).apply(console, arguments);}catch(_){ console.warn.apply(console, arguments);} }
  function err() { try{ (window.CBLog?.err  || console.error).apply(console, arguments);}catch(_){ console.error.apply(console, arguments);} }

  // Root-Refs
  var root, panel, head, body, foot;
  var currentTab = 'logs';
  var isOpen = false;

  // Hilfen -------------------------------------------------------------------
  function el(tag, cls, html){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html!=null) e.innerHTML = html;
    return e;
  }
  function setActiveTab(id){
    currentTab = id;
    var tabs = head.querySelectorAll('[data-tab]');
    tabs.forEach(function(t){ t.classList.toggle('active', t.dataset.tab===id); });
    renderTab(id);
  }

  // UI aufbauen ---------------------------------------------------------------
  function ensureUI(){
    if (root) return root;

    // Overlay
    root = el('div','ins-root');
    root.setAttribute('role','dialog');
    root.style.display = 'none';

    // Panel
    panel = el('div','ins-panel');
    var bar = el('div','ins-bar');
    var title = el('div','ins-title','Inspector <span class="ins-ver">v'+VER+'</span>');
    var close = el('button','ins-close','Schließen');
    close.addEventListener('click', closeInspector);

    bar.appendChild(title);
    bar.appendChild(close);
    panel.appendChild(bar);

    // Tabs
    head = el('div','ins-tabs');
    [
      ['overview','Übersicht'],
      ['logs','Logs'],
      ['build','Build'],
      ['paths','Pfade'],
      ['tests','Tests']
    ].forEach(function(def){
      var b = el('button','ins-tab',def[1]);
      b.dataset.tab = def[0];
      b.type='button';
      b.addEventListener('click', function(){ setActiveTab(def[0]); });
      head.appendChild(b);
    });
    panel.appendChild(head);

    // Body + Footer
    body = el('div','ins-body');
    foot = el('div','ins-foot');
    foot.innerHTML = '<small class="ins-foot-note">core '+VER+'</small>';

    panel.appendChild(body);
    panel.appendChild(foot);

    // Mount
    root.appendChild(panel);
    document.body.appendChild(root);

    // Anfangszustand
    setActiveTab(currentTab);
    return root;
  }

  // Render pro Tab ------------------------------------------------------------
  function renderTab(id){
    body.innerHTML = '';

    if (id==='logs'){
      // Minimale Platzhalter-UI, bis inspector.logs.js übernimmt
      var init = el('div','ins-note','Logs werden initialisiert …');
      var pre  = el('pre','ins-pre','Noch keine Logs …');
      body.appendChild(init);
      body.appendChild(pre);

      // Falls das Logs-Modul da ist, übergeben
      try{
        if (window.InspectorLogs && typeof window.InspectorLogs.mount==='function'){
          window.InspectorLogs.mount({container: body, pre: pre, onReady: function(){
            init.remove();
          }});
        }else{
          // Kleiner Autostart für Polyfill-Puffer
          try{ window.CBLog && window.CBLog.getBuffer && pre && (pre.textContent = (window.CBLog.getBuffer().join('\n')||'') || pre.textContent); }catch(_){}
        }
      }catch(e){ err(MOD,'Logs-Mount-Fehler', e); }
      return;
    }

    if (id==='build'){
      if (window.InspectorBuild && typeof window.InspectorBuild.mount==='function'){
        window.InspectorBuild.mount({container: body});
      }else{
        body.appendChild(el('div','ins-note','Build-Tab wird geladen …'));
      }
      return;
    }

    if (id==='paths'){
      if (window.InspectorPaths && typeof window.InspectorPaths.mount==='function'){
        window.InspectorPaths.mount({container: body});
      }else{
        body.appendChild(el('div','ins-note','Pfade-Tab wird geladen …'));
      }
      return;
    }

    if (id==='tests'){
      if (window.InspectorTests && typeof window.InspectorTests.mount==='function'){
        window.InspectorTests.mount({container: body});
      }else{
        body.appendChild(el('div','ins-note','Tests-Tab wird geladen …'));
      }
      return;
    }

    // Übersicht (default)
    var wrap = el('div','ins-overview');
    wrap.innerHTML =
      '<div class="ins-kv"><b>Runtime</b><span>'+ (navigator.userAgent||'') +'</span></div>'+
      '<div class="ins-kv"><b>Canvas</b><span id="ins-canvas-info">—</span></div>'+
      '<div class="ins-kv"><b>Map</b><span id="ins-map-info">—</span></div>';
    body.appendChild(wrap);

    // kleine Live-Infos (defensiv)
    try{
      var cv = document.getElementById('game');
      var cInfo = wrap.querySelector('#ins-canvas-info');
      if (cv && cInfo){ cInfo.textContent = cv.width+' × '+cv.height; }
      var mInfo = wrap.querySelector('#ins-map-info');
      var url = cv?.dataset?.map || '—';
      if (mInfo){ mInfo.textContent = url; }
    }catch(_){}
  }

  // Öffnen/Schließen/Toggle ---------------------------------------------------
  function openInspector(){
    ensureUI();
    if (isOpen) return;
    isOpen = true;
    root.style.display = 'block';
    document.body.classList.add('inspector-open');
    try{ window.dispatchEvent(new CustomEvent('cb:inspector-open')); }catch(_){}
    info(MOD,'geöffnet (v'+VER+')');

    // Wenn Logs-Tab aktiv ist, LogStream starten (modular)
    if (currentTab==='logs' && window.InspectorLogs && typeof window.InspectorLogs.start==='function'){
      try{ window.InspectorLogs.start(); }catch(e){ warn(MOD,'LogStream start warn',e); }
    }
  }

  function closeInspector(){
    if (!root || !isOpen) return;
    isOpen = false;
    root.style.display = 'none';
    document.body.classList.remove('inspector-open');
    try{ window.dispatchEvent(new CustomEvent('cb:inspector-close')); }catch(_){}
    info(MOD,'geschlossen');
  }

  function toggleInspector(force){
    (force==null ? !isOpen : !!force) ? openInspector() : closeInspector();
  }

  // API registrieren + Bridge absichern --------------------------------------
  function installAPI(){
    window.__INSPECTOR_API__ = { open: openInspector, close: closeInspector, toggle: toggleInspector, setTab:setActiveTab };
    window.GameUI = window.GameUI || {};
    window.GameUI.toggleInspector = toggleInspector;
    window.GameUI.openInspector   = openInspector;
    window.GameUI.closeInspector  = closeInspector;
  }

  // Boot ----------------------------------------------------------------------
  function boot(){
    try{
      ensureUI();
      installAPI();
      ok(MOD,'bereit (v'+VER+')');
    }catch(e){
      err(MOD,'Init-Fehler', e);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
