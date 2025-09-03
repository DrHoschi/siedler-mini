/* ============================================================================
 * ui-start.js — Start-UI (bereinigt, non-blocking)
 * Version: v17.4.7
 * Projekt: Neue Siedler
 *
 * Ziele
 *  - Startpanel anzeigen, aber NIE Klicks außerhalb blockieren
 *  - Nach Start: Panel vollständig entfernen (kein unsichtbares Overlay)
 *  - FAB-Buttons (Build/Inspector) immer bedienbar (hoher z-index)
 *  - Saubere Logs und Events
 *
 * Events (dispatch)
 *  - cb:ui-ready       {ver}
 *  - cb:btn-start
 *  - cb:engine-ready / cb:game-started werden nur konsumiert (falls vorhanden)
 * ========================================================================== */
(function () {
  'use strict';

  var VER = 'v17.4.7';
  var MOD = '[ui-start]';
  var root = null;

  // ---- Logging --------------------------------------------------------------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m); }catch(_){ console.log(m); } }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(m); }catch(_){ console.warn(m); } }
  function err(m){ try{ (window.CBLog?.err||console.error)(m); }catch(_){ console.error(m); } }

  // ---- FAB-Z-Layer Hardening (Buttons immer klickbar) -----------------------
  function hardenFABs(){
    try{
      var css = 'z-index:2147483647 !important; pointer-events:auto !important;';
      var b1 = document.getElementById('btn-build');
      var b2 = document.getElementById('btn-inspector');
      if (b1) b1.style.cssText = (b1.getAttribute('style')||'') + ';' + css;
      if (b2) b2.style.cssText = (b2.getAttribute('style')||'') + ';' + css;
    }catch(_){}
  }

  // ---- Start-UI bauen (nicht blockierend) -----------------------------------
  function buildStartUI(){
    if (root) return root;

    root = document.createElement('div');
    root.id = 'ui-start-root';
    // Wichtig: Root selbst fängt KEINE Klicks
    root.style.cssText = [
      'position:fixed','inset:0','z-index:10000',
      'pointer-events:none',
      'display:flex','align-items:flex-start','justify-content:center'
    ].join(';');

    // Karte (einziger klickbarer Teil)
    var card = document.createElement('div');
    card.className = 'ui-start-card';
    card.style.cssText = [
      'margin-top:64px','width:min(680px,92vw)','border-radius:18px',
      'background:rgba(10,10,10,.85)','box-shadow:0 14px 44px rgba(0,0,0,.45)',
      'backdrop-filter:blur(6px)','border:1px solid #2d2d2d',
      'color:#e9e9e9','font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'pointer-events:auto','padding:16px'
    ].join(';');

    // Titel
    var h1 = document.createElement('div');
    h1.textContent = 'City-Builder — Start';
    h1.style.cssText = 'font-weight:800;font-size:28px;margin:6px 8px 2px';
    card.appendChild(h1);

    var sub = document.createElement('div');
    sub.textContent = 'ui-start '+VER;
    sub.style.cssText = 'opacity:.6;margin:0 8px 14px;font-size:12px';
    card.appendChild(sub);

    // Map-Auswahl
    var row = document.createElement('div');
    row.style.cssText = 'margin:8px 8px 14px; display:grid; grid-template-columns:1fr; gap:8px;';
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
    btnRow.style.cssText = 'display:flex; gap:10px; margin:6px 8px 8px;';
    var btnStart = document.createElement('button');
    btnStart.textContent = '▶ Start';
    btnStart.style.cssText = 'padding:12px 18px; background:#16a34a; color:#fff; border:none; border-radius:12px; cursor:pointer; font-weight:700;';
    btnRow.appendChild(btnStart);
    var btnReset = document.createElement('button');
    btnReset.textContent = '⟳ Neu-Start';
    btnReset.style.cssText = 'padding:12px 18px; background:#1f2937; color:#ddd; border:1px solid #374151; border-radius:12px; cursor:pointer;';
    btnRow.appendChild(btnReset);
    card.appendChild(btnRow);

    // Info
    var info = document.createElement('div');
    info.textContent = 'OK UI bereit ('+MOD+' '+VER+')';
    info.style.cssText = 'opacity:.55; margin:2px 8px 8px; font-size:12px;';
    card.appendChild(info);

    root.appendChild(card);
    document.body.appendChild(root);

    // Aktionen
    btnStart.addEventListener('click', function(){
      try{ window.dispatchEvent(new CustomEvent('cb:btn-start')); }catch(_){}
      var selected = sel.value || 'assets/maps/map-mini.json';
      ok(MOD+' Start → '+selected);

      // Panel sofort nicht-blockierend + Fade-out
      safeDisableStartUI();

      // Spielstart (verschiedene Varianten akzeptieren)
      try{
        if (window.GameBoot?.start){ GameBoot.start(selected); }
        else if (window.Game?.start){ Game.start(selected); }
        else { warn(MOD+' kein GameBoot/Game gefunden – Map wird ggf. vom Bootstrap geladen.'); }
      }catch(e){ err(MOD+' Start-Fehler: '+(e && e.message)); }
    });

    btnReset.addEventListener('click', function(){ try{ location.reload(); }catch(_){}});

    // FABs hart oben halten
    hardenFABs();

    ok(MOD+' cb:ui-ready ('+VER+')');
    try{ window.dispatchEvent(new CustomEvent('cb:ui-ready',{detail:{ver:VER}})); }catch(_){}

    return root;
  }

  // ---- Panel deaktivieren & entfernen --------------------------------------
  function safeDisableStartUI(){
    if (!root) return;
    try{
      root.style.pointerEvents = 'none';
      root.style.transition = 'opacity .25s ease';
      root.style.opacity = '0';
    }catch(_){}
    // endgültig entfernen: auf Engine/Game hören oder Fallback-Timeout
    var removed = false;
    function drop(){
      if (removed) return; removed = true;
      try{ root.remove(); }catch(_){}
      root = null;
      ok(MOD+' entfernt.');
    }
    setTimeout(drop, 1000);                          // Fallback
    window.addEventListener('cb:engine-ready', drop, {once:true});
    window.addEventListener('cb:game-started', drop, {once:true});
  }

  // ---- Auto-Init ------------------------------------------------------------
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', buildStartUI, {once:true});
  } else {
    buildStartUI();
  }

  // ---- Export (optional) ----------------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI._start = { build:buildStartUI, remove:safeDisableStartUI, version:VER };

  ok(MOD+' geladen ('+VER+')');
})();
