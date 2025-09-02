/* ============================================================================
 * Datei: assets/ui/ui-bridge.js
 * Version: v17.1.2
 * Zweck:
 *   - Stellt eine stabile UI-Fassade bereit (window.GameUI)
 *   - Toggle für Bau-Menü und Inspector
 *   - Erzeugt #inspector bei Bedarf (DOM), feuert passende Events
 * Hinweise:
 *   - Greift NICHT in Game-Loop ein
 *   - Ist defensiv (keine Hard-Abhängigkeit zu Frameworks)
 * ============================================================================ */
(function(){
  'use strict';

  var GC = window.GameCore || {};
  var UI = (window.GameUI = window.GameUI || {});

  // ---------- kleine Hilfen ----------
  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, arguments);}catch(_){console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, arguments);}catch(_){console.warn.apply(console, arguments);} }

  // ---------- Build-Menü Toggle (nur Event + Body-Klasse) ----------
  UI.toggleBuild = function(){
    var open = !document.body.classList.contains('has-build-open');
    document.body.classList.toggle('has-build-open', open);
    try {
      if (open) window.dispatchEvent(new CustomEvent('cb:build-open'));
      else      window.dispatchEvent(new CustomEvent('cb:build-close'));
    } catch(_){}
    ok('[ui] Build-Toggle:', open ? 'auf' : 'zu');
  };

  // ---------- Inspector: Root & Styles ----------
  function ensureInspectorRoot(){
    var el = document.getElementById('inspector');
    if (el) return el;

    // Container erstellen
    el = document.createElement('div');
    el.id = 'inspector';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-label','Inspector');
    el.style.position = 'fixed';
    el.style.right = '12px';
    el.style.bottom = '80px';
    el.style.width = '360px';
    el.style.maxWidth = '90vw';
    el.style.maxHeight = '70vh';
    el.style.overflow = 'auto';
    el.style.background = 'rgba(20,20,20,.94)';
    el.style.border = '1px solid #333';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 14px 40px rgba(0,0,0,.45)';
    el.style.backdropFilter = 'blur(6px)';
    el.style.color = '#eaeaea';
    el.style.font = '14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    el.style.zIndex = '100001';
    el.style.display = 'none'; // erst sichtbar beim Öffnen

    // Kopf
    var head = document.createElement('div');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.justifyContent = 'space-between';
    head.style.gap = '8px';
    head.style.padding = '10px 12px';
    head.style.borderBottom = '1px solid #2d2d2d';
    var title = document.createElement('div'); title.textContent = 'Inspector';
    title.style.fontWeight = '700';
    var close = document.createElement('button'); close.textContent = '✕';
    close.setAttribute('aria-label','schließen');
    close.style.background = 'transparent';
    close.style.border = '1px solid #3a3a3a';
    close.style.borderRadius = '4px';
    close.style.color = '#ddd';
    close.style.cursor = 'pointer';
    close.onclick = function(){ UI.toggleInspector(false); };
    head.appendChild(title); head.appendChild(close);
    el.appendChild(head);

    // Tabs-Container (Core erwartet das ggf.)
    var tabs = document.createElement('div');
    tabs.id = 'inspector-tabs';
    tabs.style.display = 'block';
    tabs.style.padding = '8px 10px';
    el.appendChild(tabs);

    document.body.appendChild(el);
    ok('[inspector.ui] Root erzeugt');
    return el;
  }

  function showInspector(show){
    var el = ensureInspectorRoot();
    var visible = (show===undefined) ? (el.style.display==='none') : !!show;
    el.style.display = visible ? 'block' : 'none';
    try {
      if (visible) window.dispatchEvent(new CustomEvent('cb:inspector-open'));
      else         window.dispatchEvent(new CustomEvent('cb:inspector-close'));
    } catch(_){}
  }

  // ---------- Public Toggle ----------
  UI.toggleInspector = function(force){
    try {
      var el = document.getElementById('inspector');
      var isOpen = el && el.style.display !== 'none';
      var wantOpen = (typeof force==='boolean') ? force : !isOpen;
      showInspector(wantOpen);
      ok('[ui] Inspector-Toggle:', wantOpen ? 'auf' : 'zu');
    } catch(e){
      warn('[ui] Inspector-Toggle Fehler:', e && e.message);
    }
  };

  ok('[ui-bridge] bereit (v17.1.2)');
})();
