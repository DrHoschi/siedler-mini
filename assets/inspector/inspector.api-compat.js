/*!
 * Inspector API-Compat Bridge
 * Zweck:
 *  - Stellt sicher, dass window.GameUI.open/toggle/closeInspector immer vorhanden sind.
 *  - Falls andere Skripte window.GameUI überschreiben, werden die Inspector-Methoden restauriert.
 *  - Zusätzliche Fallbacks über DOM-Öffnen (id="inspector") + Events.
 *
 * Reihenfolge in index.html:
 *    ... inspector.core.js
 *    inspector.logs.js / .paths.js / .tests.js / .resources.js
 *    → inspector.api-compat.js   <-- direkt DANACH laden
 *
 * Diese Bridge fasst die bestehenden Inspector-Module NICHT an.
 */

(function () {
  'use strict';
  var MOD = '[inspector.api-compat]';

  // --- kleine Utils ---------------------------------------------------------
  var on = window.addEventListener.bind(window);
  var $  = function(sel){ return document.querySelector(sel); };

  function dbg(){ try{ (window.CBLog?.info || console.log).apply(console, arguments);}catch(_){} }
  function warn(){ try{ (window.CBLog?.warn || console.warn).apply(console, arguments);}catch(_){} }

  // Merker für gesicherte Inspector-Funktionen (früh nach core.js holen)
  var BACKUP = (function snapshot(){
    // Wenn der Inspector-Core korrekt geladen wurde, hat er diese Hooks gesetzt:
    //   window.GameUI.toggleInspector / openInspector / closeInspector
    var ui = (window.GameUI = window.GameUI || {});
    var saved = {
      open : typeof ui.openInspector  === 'function' ? ui.openInspector  : null,
      close: typeof ui.closeInspector === 'function' ? ui.closeInspector : null,
      tog  : typeof ui.toggleInspector=== 'function' ? ui.toggleInspector: null
    };
    // Zusätzlich merken wir uns, ob der Core global exportiert ist (nur Info).
    saved.hasCore = !!(window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.api);
    return saved;
  })();

  // --- DOM-Fallback (nur falls nötig) ---------------------------------------
  // Falls irgendein Skript GameUI überschrieben hat UND der Core noch nicht initialisiert,
  // ermöglichen wir ein simples Open/Close über das Overlay-Element #inspector.
  function ensureOverlayEl(){
    var el = document.getElementById('inspector');
    return el || null;
  }

  function domOpen(){
    var el = ensureOverlayEl();
    if (el) {
      el.style.display = 'flex';
      el.setAttribute('aria-hidden','false');
      document.body.classList.add('inspector-open');
      try{ window.dispatchEvent(new CustomEvent('cb:inspector-open')); }catch(_){}
      dbg(MOD,'domOpen() – Overlay sichtbar.');
      return true;
    }
    return false;
  }

  function domClose(){
    var el = ensureOverlayEl();
    if (el) {
      el.style.display = 'none';
      el.setAttribute('aria-hidden','true');
      document.body.classList.remove('inspector-open');
      try{ window.dispatchEvent(new CustomEvent('cb:inspector-close')); }catch(_){}
      dbg(MOD,'domClose() – Overlay versteckt.');
      return true;
    }
    return false;
  }

  function domToggle(){
    var el = ensureOverlayEl();
    if (!el) return false;
    var willOpen = el.style.display !== 'flex';
    return willOpen ? domOpen() : domClose();
  }

  // --- Rebind-Logik ---------------------------------------------------------
  function bindGameUI(){
    var ui = (window.GameUI = window.GameUI || {});

    // Prüfen, ob Core-Hooks da sind – wenn ja, verwenden; sonst DOM-Fallback.
    var open  = BACKUP.open  || domOpen;
    var close = BACKUP.close || domClose;
    var tog   = BACKUP.tog   || domToggle;

    // Wenn inzwischen von anderen Skripten überschrieben → wiederherstellen.
    ui.openInspector   = open;
    ui.closeInspector  = close;
    ui.toggleInspector = tog;

    dbg(MOD, 'gebunden – open:%s close:%s toggle:%s (core:%s)',
      (open===domOpen?'dom':'core'),
      (close===domClose?'dom':'core'),
      (tog===domToggle?'dom':'core'),
      BACKUP.hasCore ? 'ja' : 'nein'
    );
  }

  // Sofort binden (wir hängen direkt NACH den Inspector-Modulen in der Seite)
  bindGameUI();

  // Sicherheitsnetz: Falls später nochmal jemand GameUI ersetzt, fixen wir es erneut.
  on('DOMContentLoaded', bindGameUI);
  on('cb:ui-ready', bindGameUI);

  // Event-Brücke (optional, falls jemand die alten Trigger nutzt)
  on('inspector:open',  function(){ try{ window.GameUI.openInspector(); } catch(e){ warn(MOD,'open err',e);} });
  on('inspector:close', function(){ try{ window.GameUI.closeInspector(); } catch(e){ warn(MOD,'close err',e);} });
  on('inspector:toggle',function(){ try{ window.GameUI.toggleInspector(); }catch(e){ warn(MOD,'toggle err',e);} });

  // Click-Hook, falls du irgendwo data-action="toggle-inspector" nutzt
  document.addEventListener('click', function(ev){
    var t = ev.target;
    if (!t) return;
    if (t.matches && t.matches('[data-action="toggle-inspector"]')) {
      try{ window.GameUI.toggleInspector(); } catch(e){ warn(MOD,'click toggle err',e); }
      ev.preventDefault();
    }
  }, true);

  dbg(MOD,'bereit.');
})();
