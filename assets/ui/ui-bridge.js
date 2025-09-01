// ui-bridge.js — v16.3.6
// Brücke zwischen Game, Start-UI, Bau-Menü und Inspector.
// - Erzeugt die Floating-Buttons (Bauen / Inspector) fix am Viewport
// - Öffnet Bau-Menü NICHT automatisch: erst per Button
// - Bindet sich an cb:ui-ready / cb:game-started Events
// - Achtet darauf, dass nichts mit dem Canvas mit-zoomt

(function () {
  'use strict';

  var VERSION = 'v16.3.6';

  // ---------- Logging ----------
  function log(){ (window.CBLog && CBLog.log ? CBLog.log : console.log).apply(console, arguments); }
  function ok(){  (window.CBLog && CBLog.ok  ? CBLog.ok  : console.log).apply(console, arguments); }
  function warn(){(window.CBLog && CBLog.warn? CBLog.warn : console.warn).apply(console, arguments); }

  // ---------- Singletons ----------
  var Bridge = (window.GameUI = window.GameUI || {});
  var BuildUI = window.BuildUI || {};           // aus assets/ui/ui-build.js
  var Inspector = (window.Inspector || {});     // aus assets/inspector/inspector.js

  // ---------- DOM Helpers ----------
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function ce(tag, cls, html){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  // einen Button nur einmal bauen
  function ensureBtn(id, html, side, bottomPx){
    var el = qs('#'+id);
    if (el) return el;
    el = ce('button','cb-fab '+side, html);
    el.id = id;
    el.type = 'button';
    el.setAttribute('aria-label', id);
    // fix am Viewport, nicht zoombar:
    el.style.position = 'fixed';
    el.style.zIndex = '2147483640';
    el.style.bottom = (bottomPx||18)+'px';
    if (side === 'left')  el.style.left  = '18px';
    if (side === 'right') el.style.right = '18px';
    document.body.appendChild(el);
    return el;
  }

  // beim offenen Bau-Menü die Buttons etwas hochschieben
  function liftFloatingButtons(isOpen){
    var lift = isOpen ? 88 : 18;
    var btnBuild = qs('#cb-btn-build');
    var btnInsp  = qs('#cb-btn-inspector');
    if (btnBuild) btnBuild.style.bottom = lift + 'px';
    if (btnInsp)  btnInsp.style.bottom  = lift + 'px';
  }

  // ---------- Bridge-Setup ----------
  function install(){
    // FABs erstellen (sind fix, zoomen nicht mit)
    var btnBuild = ensureBtn('cb-btn-build', '🧱', 'left', 18);
    var btnInsp  = ensureBtn('cb-btn-inspector', '🛠️', 'right', 18);

    // zunächst ausblenden – erst im Spiel sichtbar
    btnBuild.style.display = 'none';
    btnInsp.style.display  = 'none';

    // Klick-Handler
    btnBuild.onclick = function(){
      if (!BuildUI || !BuildUI.toggle) return warn('[bridge] BuildUI.toggle fehlt');
      var opened = BuildUI.toggle();           // true/false zurück
      liftFloatingButtons(opened);
    };

    btnInsp.onclick = function(){
      if (!window.Inspector || !Inspector.toggle) return warn('[bridge] Inspector.toggle fehlt');
      Inspector.toggle();
    };

    ok('[ui-bridge] Buttons bereit ('+VERSION+')');
  }

  // ---------- Event-Bindings ----------
  // Start-Panel öffnen, wenn UI steht
  window.addEventListener('cb:ui-ready', function(){
    if (Bridge && typeof Bridge.openStartPanel === 'function') {
      try { Bridge.openStartPanel(); } catch(e){}
    }
  });

  // Wenn Spiel fertig ist:
  window.addEventListener('cb:game-started', function(){
    // Inspector init (aber nicht auto-offen)
    if (window.Inspector && Inspector.init && !Inspector._ready){
      try { Inspector.init({autoOpen:false}); } catch(e){}
    }

    // Bau-Menü initialisieren und geschlossen lassen
    if (window.BuildUI && BuildUI.init){
      try { BuildUI.init(); BuildUI.close(); } catch(e){}
    }

    // Floating-Buttons anzeigen
    var b = qs('#cb-btn-build'), i = qs('#cb-btn-inspector');
    if (b) b.style.display = '';
    if (i) i.style.display = '';

    liftFloatingButtons(false);
    ok('[ui-bridge] game-started → UI aktiv');
  });

  // einmalig beim Laden
  try { install(); } catch(e){ warn('[ui-bridge] install error', e); }
})();
