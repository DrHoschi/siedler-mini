/* ============================================================================
 * ui-start.js — Start-UI (bereinigt)
 * Version: v17.4.6
 * Projekt: Neue Siedler
 *
 * Ziele
 *  - Startpanel anzeigen (City-Builder — Start)
 *  - Panel/Overlay blockiert NIE Klicks auf die FAB-Buttons
 *  - Nach Start: Startpanel KOMPLETT entfernen (kein unsichtbares Overlay!)
 *  - FAB-Z-Layer-Hardening (Inspector/Build sind immer klickbar)
 *
 * Events (sendet)
 *  - window.dispatchEvent(new CustomEvent('cb:ui-ready', {detail:{ver}}))
 *  - window.dispatchEvent(new CustomEvent('cb:btn-start'))
 *
 * Abhängigkeiten
 *  - Optional: window.GameBoot.start(mapUrl) ODER window.Game?.start(mapUrl)
 *  - Optional: window.CBLog (für hübschere Logs)
 * ========================================================================== */
(function () {
  'use strict';

  var VER = 'v17.4.6';
  var MOD = '[ui-start]';

  // ---- Log-Helfer -----------------------------------------------------------
  function ok(msg){ try{ (window.CBLog?.ok || console.log)(msg); }catch(_){ console.log(msg); } }
  function warn(msg){ try{ (window.CBLog?.warn || console.warn)(msg); }catch(_){ console.warn(msg); } }
  function err(msg){ try{ (window.CBLog?.err || console.error)(msg); }catch(_){ console.error(msg); } }

  // ---- FAB-Z-Layer Hardening ------------------------------------------------
  function hardenFABs(){
    try{
      var s = 'z-index:2147483647 !important; pointer-events:auto !important;';
      var b1 = document.getElementById('btn-build');
      var b2 = document.getElementById('btn-inspector');
      if (b1) b1.style.cssText = (b1.getAttribute('style')||'') + ';' + s;
      if (b2) b2.style.cssText = (b2.getAttribute('style')||'') + ';' + s;
    }catch(_){}
  }
  hardenFABs();
  // Re-apply bei DOM-Änderungen (falls etwas Styles überschreibt)
  try{
    var fabObs = new MutationObserver(hardenFABs);
    fabObs.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['style','class']});
  }catch(_){}

  // ---- Start-Panel bauen ----------------------------------------------------
  var root = null;
  function buildStartUI(){
    if (root) return root;

    root = document.createElement('div');
    root.id = 'ui-start-root';
    // Wichtig: WIR BLOCKIEREN NICHT – standardmäßig durchklickbar
    root.style.cssText = [
      'position:fixed','inset:0','z-index:10000',
      'pointer-events:none',          // per default NICHT blockieren
      'display:flex','align-items:flex-start','justify-content:center'
    ].join(';');

    // Karte/Select/Buttons-Karte (der klickbare Teil)
    var card = document.createElement('div');
    card.className = 'ui-start-card';
    card.style.cssText = [
      'margin-top:64px','width:min(680px,92vw)','border-radius:18px',
      'background:rgba(10,10,10,.85)','box-shadow:0 14px 44px rgba(0,0,0,.45)',
      'backdrop-filter:blur(6px)','border:1px solid #2d2d2d',
      'color:#e9e9e9','font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'pointer-events:auto',          // NUR die Karte ist klickbar
      'padding:16px'
    ].join(';');

    // Titelleiste
    var h1 = document.createElement('div');
    h1.textContent = 'City-Builder — Start';
    h1.style.cssText = 'font-weight:800;font-size:28px;margin:6px 8px 2px';
    card.appendChild(h1);

    var sub = document.createElement('div');
    sub.textContent = 'index '+VER;
    sub.style.cssText = 'opacity:.6;margin:0 8px 14px;font-size:12px';
    card.appendChild(sub);

    // Map-Auswahl (simpler Select, kann später erweitert werden)
    var row = document.createElement('div'); row.style.cssText='margin:8px 8px 14px; display:grid; grid-template-columns:1fr; gap:8px;';
    var sel = document.createElement('select');
    sel.id = 'ui-start-map';
    sel.style.cssText = 'width:100%; padding:10px; border-radius:10px; background:#151515; color:#eee; border:1px solid #333;';
    ['assets/maps/map-mini.json','assets/maps/map-demo.json','assets/maps/map-pro.json'].forEach(function(p){
      var op=document.createElement('option'); op.value=p; op.textContent=p.split('/').pop(); sel.appendChild(op);
    });
    row.appendChild(sel);
    card.appendChild(row);

    // Buttons
    var btnRow = document.createElement('div');
    btnRow.style.cssText='display:flex; gap:10px; margin:6px 8px 8px;';
    var btnStart = document.createElement('button');
    btnStart.textContent = '▶ Start';
    btnStart.style.cssText = 'padding:12px 18px; background:#16a34a; color:#fff; border:none; border-radius:12px; cursor:pointer; font-weight:700;';
    btnRow.appendChild(btnStart);

    var btnReset = document.createElement('button');
    btnReset.textContent = '⟳ Neu-Start';
    btnReset.style.cssText = 'padding:12px 18px; background:#1f2937; color:#ddd; border:1px solid #374151; border-radius:12px; cursor:pointer;';
    btnRow.appendChild(btnReset);
    card.appendChild(btnRow);

    // Loghinweis
    var info = document.createElement('div');
    info.textContent = 'OK UI bereit ('+MOD+' '+VER+')';
    info.style.cssText = 'opacity:.55; margin:2px 8px 8px; font-size:12px;';
    card.appendChild(info);

    // zusammenfügen
    root.appendChild(card);
    document.body.appendChild(root);

    // Button-Aktionen
    btnStart.addEventListener('click', function(){
      try{ window.dispatchEvent(new CustomEvent('cb:btn-start')); }catch(_){}
      var selected = sel.value || 'assets/maps/map-mini.json';
      ok(MOD+' Start → '+selected);

      // Panel sofort deaktivieren (kein Blocken), dann nach Start entfernen
      safeDisableStartUI();

      // Start versuchen (verschiedene Boot-Varianten)
      try{
        if (window.GameBoot?.start){ GameBoot.start(selected); }
        else if (window.Game?.start){ Game.start(selected); }
        else { warn(MOD+' kein GameBoot/Game gefunden – starte nur Rendering.'); }
      }catch(e){ err(MOD+' Start-Fehler: '+(e && e.message)); }
    });

    btnReset.addEventListener('click', function(){
      try{ location.reload(); }catch(_){}
    });

    ok(MOD+' cb:ui-ready ('+VER+')');
    try{ window.dispatchEvent(new CustomEvent('cb:ui-ready',{detail:{ver:VER}})); }catch(_){}
    return root;
  }

  // ---- Start-UI deaktivieren + endgültig entfernen --------------------------
  function safeDisableStartUI(){
    if (!root) return;
    try{
      // sofort NICHT blockieren:
      root.style.pointerEvents = 'none';
      // Karte visuell ausfaden
      root.style.transition = 'opacity .25s ease';
      root.style.opacity = '0';
    }catch(_){}
    // endgültig entfernen, sobald das Spiel wirklich „läuft“
    var removed = false;
    function drop(){
      if (removed) return; removed = true;
      try{ root.remove(); }catch(_){}
      root = null;
      ok(MOD+' entfernt.');
    }
    // harte Zeitgrenze (Failsafe)
    setTimeout(drop, 1000);
    // echte Events bevorzugen
    window.addEventListener('cb:engine-ready', drop, {once:true});
    window.addEventListener('cb:game-started', drop, {once:true});
  }

  // ---- Auto-Build bei DOM-Ready --------------------------------------------
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', buildStartUI, {once:true});
  } else {
    buildStartUI();
  }

  // ---- Exporte (optional) ---------------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI._start = {
    build: buildStartUI,
    remove: safeDisableStartUI,
    version: VER
  };

})();
