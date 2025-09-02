// assets/ui/ui-start.js — v16.3.3
(function () {
  'use strict';

  var VERSION = 'v16.3.3';
  var panel, mapSelect, btnStart, btnRestart, btnCopyLog, btnCache;

  function log(){ (window.CBLog && CBLog.log ? CBLog.log : console.log).apply(console, arguments); }
  function ok(){ (window.CBLog && CBLog.ok  ? CBLog.ok  : console.log).apply(console, arguments); }
  function warn(){ (window.CBLog && CBLog.warn? CBLog.warn: console.warn).apply(console, arguments); }

  window.GameUI = window.GameUI || {};
  var GameUI = window.GameUI;

  function el(tag, cls, parent){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  function ensureStyleOnce(){
    if (document.getElementById('ui-start-style')) return;
    var css = `
      .ui-start-bg{ position:fixed; inset:0; z-index:5; background:url(./assets/ui/start-bg.jpeg) center/cover no-repeat; filter: brightness(.9); }
      .ui-start-panel{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:6; pointer-events:none; }
      .ui-start-card{ pointer-events:auto; width:min(680px, 92vw); background:rgba(17,25,21,.86); box-shadow:0 20px 60px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06); backdrop-filter: blur(12px); border-radius:18px; padding:22px 20px; color:#e8efe8; font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
      .ui-start-title{ font-size:28px; font-weight:700; letter-spacing:.2px; margin:0 0 8px 0; }
      .ui-start-meta{ opacity:.7; font-size:12px; margin-bottom:16px; }
      .ui-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
      .ui-input, .ui-btn{ width:100%; border-radius:14px; padding:14px 16px; font-size:16px; background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)); color:#e8efe8; border:1px solid rgba(255,255,255,.08); }
      .ui-input{ appearance:none; }
      .ui-btn{ cursor:pointer; text-align:center; user-select:none; }
      .ui-btn.primary{ background:linear-gradient(180deg, #2fd17a, #19a55b); color:#0b2518; font-weight:700; }
      .ui-btn.ghost{ background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)); }
      .ui-note{ margin-top:12px; font-size:12px; opacity:.6; }
      @media (max-width:560px){ .ui-grid{ grid-template-columns:1fr; } }
      .hidden{ display:none !important; }
    `;
    var st = document.createElement('style');
    st.id = 'ui-start-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildPanel(){
    ensureStyleOnce();

    var bg = el('div', 'ui-start-bg hidden', document.body);
    panel = el('div', 'ui-start-panel hidden', document.body);
    var card = el('div', 'ui-start-card', panel);

    var title = el('div', 'ui-start-title', card);
    title.textContent = 'City-Builder — Start';
    var meta = el('div', 'ui-start-meta', card);
    meta.textContent = 'index ' + (window.INDEX_VERSION || 'v16.3.3');

    var lbl = el('div', null, card); lbl.style.margin='6px 0 6px'; lbl.textContent = 'Karte:';
    mapSelect = el('select', 'ui-input', card);
    ['assets/maps/map-mini.json','assets/maps/map-pro.json','assets/maps/map-demo.json'].forEach(function(u){
      var o = el('option', null, mapSelect); o.value = u; o.textContent = u.split('/').pop();
    });

    var grid = el('div', 'ui-grid', card);
    var btnStart   = el('button','ui-btn primary', grid);  btnStart.textContent = '▶ Start';
    var btnRestart = el('button','ui-btn ghost',   grid);  btnRestart.textContent = '⟳ Neu-Start';
    var btnCache   = el('button','ui-btn ghost',   grid);  btnCache.textContent = '🧹 Cache-Booster';
    var btnCopyLog = el('button','ui-btn ghost',   grid);  btnCopyLog.textContent = '📋 Log kopieren';

    var note = el('div','ui-note', card);
    note.textContent = 'OK UI bereit (ui-start ' + VERSION + ')';

    btnStart.addEventListener('click', function(){
      if (GameUI && typeof GameUI.closeBuildBar === 'function') GameUI.closeBuildBar();
      close();
      var mapUrl = mapSelect.value || 'assets/maps/map-mini.json';
      if (window.GameBoot && typeof GameBoot.start === 'function') {
        ok('[boot] Start via GameBoot.start', mapUrl);
        GameBoot.start(mapUrl);
      } else if (window.GameLoader && typeof GameLoader._start === 'function'){
        ok('[boot] Start via GameLoader._start', mapUrl);
        GameLoader._start(mapUrl);
      } else if (window.Game && typeof Game.startGame === 'function') {
        ok('[boot] Start via Game.startGame', mapUrl);
        Game.startGame(mapUrl);
      } else {
        warn('[ui-start] Kein Start-Entry gefunden.');
      }
    });

    btnRestart.addEventListener('click', function(){
      try { localStorage && localStorage.clear && localStorage.clear(); } catch(_){}
      location.reload();
    });

    btnCache.addEventListener('click', function(){
      if ('serviceWorker' in navigator){
        navigator.serviceWorker.getRegistrations().then(function(regs){
          regs.forEach(function(r){ r.unregister(); });
          if (caches && caches.keys) caches.keys().then(function(keys){ keys.forEach(function(k){ caches.delete(k); }); });
          ok('[cache] SW unregistered + Caches cleared');
          setTimeout(function(){ location.reload(); }, 150);
        });
      } else {
        if (caches && caches.keys) caches.keys().then(function(keys){ keys.forEach(function(k){ caches.delete(k); }); });
        location.reload();
      }
    });

    btnCopyLog.addEventListener('click', function(){
      var txt = (window.CBLog && CBLog.dump ? CBLog.dump() : '[kein CBLog]');
      try { navigator.clipboard.writeText(txt); ok('[ui-start] Log in Zwischenablage.'); } catch(_){}
    });

    function open(){ bg.classList.remove('hidden'); panel.classList.remove('hidden'); }
    function close(){ bg.classList.add('hidden');  panel.classList.add('hidden'); }

    GameUI.openStartPanel  = open;
    GameUI.closeStartPanel = close;
  }

  function init(){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    buildPanel();
    ok('[ui-start] Modul geladen ('+VERSION+')');
    GameUI.openStartPanel();
    window.addEventListener('cb:engine-ready', function(){ ok('[ui-start] cb:ui-ready ('+VERSION+')'); });
  }

  init();
})();
