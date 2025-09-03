/* ============================================================================
 * Datei: assets/ui/ui-bridge.js
 * Version: v17.1.4
 * Zweck:
 *   - Stabile UI-Fassade (window.GameUI)
 *   - Kompatibles Toggle fürs Bau-Menü (APIs + Events)
 *   - Fallback: kleines Build-Panel, falls kein eigenes vorhanden ist
 *   - Inspector öffnen/schließen (Events), ohne Core zu ersetzen
 * ============================================================================ */
(function(){
  'use strict';

  var UI = (window.GameUI = window.GameUI || {});
  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, arguments);}catch(_){console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, arguments);}catch(_){console.warn.apply(console, arguments);} }

  // ---------- Build: Fallback-Panel ----------
  function ensureBuildPanel(){
    var el = document.getElementById('ui-build');
    if (el) return el;
    el = document.createElement('div');
    el.id='ui-build';
    el.setAttribute('role','dialog');
    el.style.position='fixed';
    el.style.left='50%'; el.style.bottom='80px'; el.style.transform='translateX(-50%)';
    el.style.width='min(520px, 92vw)';
    el.style.maxHeight='60vh'; el.style.overflow='auto';
    el.style.background='rgba(18,18,18,.96)';
    el.style.border='1px solid #2f2f2f'; el.style.borderRadius='10px';
    el.style.boxShadow='0 18px 48px rgba(0,0,0,.45)'; el.style.backdropFilter='blur(6px)';
    el.style.color='#eee'; el.style.zIndex='100002'; el.style.display='none';

    var head=document.createElement('div');
    head.style.display='flex'; head.style.alignItems='center'; head.style.justifyContent='space-between';
    head.style.padding='10px 12px'; head.style.borderBottom='1px solid #2b2b2b';
    var title=document.createElement('div'); title.textContent='Bau-Menü (Fallback)';
    title.style.fontWeight='700';
    var close=document.createElement('button'); close.textContent='Schließen';
    close.style.background='transparent'; close.style.border='1px solid #3a3a3a';
    close.style.borderRadius='4px'; close.style.color='#ddd'; close.style.cursor='pointer';
    close.onclick=function(){ UI.toggleBuild(false); };
    head.appendChild(title); head.appendChild(close);
    el.appendChild(head);

    var body=document.createElement('div');
    body.style.padding='10px 12px';
    body.innerHTML='<div style="opacity:.8">Dein spezielles Bau-UI wurde nicht gefunden – dieses Panel ist nur ein Platzhalter.<br>Die Buttons links/unten bleiben verschiebbar.</div>';
    el.appendChild(body);

    document.body.appendChild(el);
    return el;
  }

  function setBuildOpen(open){
    document.body.classList.toggle('has-build-open', !!open);

    // vorhandene Module bevorzugen
    if (window.UIBuild?.toggle) { window.UIBuild.toggle(open); }
    else if (window.GameUIBuild?.toggle) { window.GameUIBuild.toggle(open); }
    else {
      // Fallback sichtbar schalten
      var pane=ensureBuildPanel();
      pane.style.display = open ? 'block' : 'none';
    }

    try {
      window.dispatchEvent(new CustomEvent('cb:build-toggle', { detail:{ open:!!open } }));
      window.dispatchEvent(new CustomEvent(open ? 'cb:build-open' : 'cb:build-close'));
    } catch(_){}

    ok('[ui] Build:', open ? 'auf' : 'zu');
  }

  UI.toggleBuild = function(force){
    try{
      var isOpen = document.body.classList.contains('has-build-open') ||
                   (document.getElementById('ui-build')?.style.display!=='none');
      var wantOpen = (typeof force==='boolean') ? !!force : !isOpen;
      setBuildOpen(wantOpen);
    }catch(e){ warn('[ui] Build-Toggle Fehler:', e?.message); }
  };

  // ---------- Inspector ----------
  function isInspectorOpen(){
    var el = document.getElementById('inspector');
    return el && el.style.display !== 'none';
  }
  UI.toggleInspector = function(force){
    try{
      var wantOpen = (typeof force==='boolean') ? !!force : !isInspectorOpen();
      // eigene API respektieren
      if (window.Inspector?.toggle) window.Inspector.toggle(wantOpen);
      // Events feuern (für Kombi- oder externe Varianten)
      window.dispatchEvent(new CustomEvent(wantOpen ? 'cb:inspector-open' : 'cb:inspector-close'));
      ok('[ui] Inspector:', wantOpen ? 'auf' : 'zu');
    }catch(e){ warn('[ui] Inspector-Toggle Fehler:', e?.message); }
  };

  ok('[ui-bridge] bereit (v17.1.4)');
})();
