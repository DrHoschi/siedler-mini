/* ============================================================================
 * Datei: assets/ui/ui-bridge.js
 * Version: v17.1.3
 * Zweck:
 *   - Stabile UI-Fassade (window.GameUI)
 *   - Kompatibles Toggle fürs Bau-Menü (ruft vorhandene APIs + Events)
 *   - Inspector-Öffnen/Schließen ohne Core zu ersetzen
 *   - KEIN Erzeugen/Überschreiben von #inspector mehr
 * ============================================================================ */
(function(){
  'use strict';

  var UI = (window.GameUI = window.GameUI || {});

  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, arguments);}catch(_){console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, arguments);}catch(_){console.warn.apply(console, arguments);} }

  // -------------------- Bau-Menü: robustes Toggle -----------------------------
  // Unterstützt:
  //  - window.UIBuild.toggle(open?)
  //  - window.GameUIBuild.toggle(open?)
  //  - Events: cb:build-open / cb:build-close / cb:build-toggle{open}
  function setBuildOpen(open){
    // Body-Klasse (Layout)
    document.body.classList.toggle('has-build-open', !!open);

    // Events
    try {
      window.dispatchEvent(new CustomEvent('cb:build-toggle', { detail:{ open:!!open } }));
      window.dispatchEvent(new CustomEvent(open ? 'cb:build-open' : 'cb:build-close'));
    } catch(_){}

    ok('[ui] Build:', open ? 'auf' : 'zu');
  }

  UI.toggleBuild = function(force){
    try {
      var open;
      // Direkt-APIs bevorzugen
      if (window.UIBuild && typeof window.UIBuild.toggle === 'function'){
        open = (typeof force === 'boolean') ? !!force : undefined;
        window.UIBuild.toggle(open);
        // Rückfall: Body/Events trotzdem konsistent setzen
        if (typeof open === 'boolean') setBuildOpen(open);
        return;
      }
      if (window.GameUIBuild && typeof window.GameUIBuild.toggle === 'function'){
        open = (typeof force === 'boolean') ? !!force : undefined;
        window.GameUIBuild.toggle(open);
        if (typeof open === 'boolean') setBuildOpen(open);
        return;
      }

      // Kein UI-Module? → Nur Body/Events
      var isOpen = document.body.classList.contains('has-build-open');
      open = (typeof force === 'boolean') ? !!force : !isOpen;
      setBuildOpen(open);

    } catch(e){
      warn('[ui] Build-Toggle Fehler:', e && e.message);
    }
  };

  // -------------------- Inspector: nur öffnen/schließen -----------------------
  // Greift NICHT mehr in den DOM-Core ein – überlässt dies deiner inspector.js.
  // Feuert kompatible Events, damit dein Inspector reagieren kann.
  function isInspectorOpen(){
    var el = document.getElementById('inspector');
    return el && el.style.display !== 'none';
  }

  UI.toggleInspector = function(force){
    try {
      var wantOpen = (typeof force === 'boolean') ? !!force : !isInspectorOpen();
      // Wenn dein Inspector eigene API hat, nutzen:
      if (window.Inspector && typeof window.Inspector.toggle === 'function'){
        window.Inspector.toggle(wantOpen);
      }
      // Events, damit dein Code die Sichtbarkeit steuern kann:
      window.dispatchEvent(new CustomEvent(wantOpen ? 'cb:inspector-open' : 'cb:inspector-close'));
      ok('[ui] Inspector:', wantOpen ? 'auf' : 'zu');
    } catch(e){
      warn('[ui] Inspector-Toggle Fehler:', e && e.message);
    }
  };

  ok('[ui-bridge] bereit (v17.1.3)');
})();
