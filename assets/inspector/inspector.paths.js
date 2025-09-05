/* ============================================================================
 * assets/inspector/inspector.paths.js — v18.10.5
 * Projekt: Neue Siedler
 * Zweck:
 *   - Inspector-Tab „Pfade“
 *   - Overlay-Toggle (window.DEBUG_PATH_OVERLAY) + Heatmap-Reset
 *   - Live-Statistik (sofern vorhanden): __CB.pathsStats {heatMax, lastPaths:[{len,ts}]}
 *   - Events: cb:paths:toggle, cb:paths:reset
 *
 * CODE-STYLE:
 *   - Robust, keine harten Abhängigkeiten
 *   - Sanfte Logs via CBLog
 *   - Verträglich mit PathFinder.drawOverlay(ctx, cam)
 * ========================================================================== */

(function(){
  'use strict';

  var MOD = '[inspector.paths]';
  var info = (window.CBLog?.info || console.log).bind(console, MOD);
  var warn = (window.CBLog?.warn || console.warn).bind(console, MOD);

  window.__CB = window.__CB || {};
  var STATE = window.__CB;
  STATE.pathsEnabled = !!STATE.pathsEnabled;          // persistentes Flag
  window.DEBUG_PATH_OVERLAY = !!window.DEBUG_PATH_OVERLAY || !!STATE.pathsEnabled;

  function toggleOverlay(){
    var newVal = !window.DEBUG_PATH_OVERLAY;
    window.DEBUG_PATH_OVERLAY = newVal;
    STATE.pathsEnabled = newVal;
    try { window.dispatchEvent(new CustomEvent('cb:paths:toggle',{detail:{enabled:newVal}})); } catch(_){}
    info('overlay %s', newVal?'on':'off');
  }

  function resetHeat(){
    try { window.dispatchEvent(new CustomEvent('cb:paths:reset')); } catch(_){}
    if (STATE.pathsStats){ STATE.pathsStats.heatMax = 0; STATE.pathsStats.lastPaths = []; }
    info('heat reset');
  }

  // UI-Render
  function renderPathsTab(target){
    var box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-direction:column;gap:10px';

    // Aktionen
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';

    var btnToggle = document.createElement('button');
    btnToggle.textContent = (window.DEBUG_PATH_OVERLAY?'Overlay AUS':'Overlay AN');
    btnToggle.style.cssText = 'border:none;border-radius:10px;padding:8px 12px;background:#3A6FD8;color:#fff;cursor:pointer';
    btnToggle.onclick = function(){
      toggleOverlay();
      btnToggle.textContent = (window.DEBUG_PATH_OVERLAY?'Overlay AUS':'Overlay AN');
      refreshStats();
    };

    var btnReset = document.createElement('button');
    btnReset.textContent = 'Heatmap zurücksetzen';
    btnReset.style.cssText = 'border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer';
    btnReset.onclick = function(){ resetHeat(); refreshStats(); };

    row.appendChild(btnToggle);
    row.appendChild(btnReset);
    box.appendChild(row);

    // Status
    var stat = document.createElement('div');
    stat.style.cssText = 'opacity:.85;display:grid;grid-template-columns:auto 1fr;column-gap:12px;row-gap:6px;border-top:1px dashed rgba(255,255,255,.10);padding-top:8px';

    function addKV(k,v){
      var l = document.createElement('div'); l.textContent = k; l.style.cssText='opacity:.75';
      var r = document.createElement('div'); r.textContent = v; r.style.cssText='text-align:right';
      stat.appendChild(l); stat.appendChild(r);
    }

    function refreshStats(){
      stat.innerHTML = '';
      addKV('Overlay', window.DEBUG_PATH_OVERLAY ? 'AN' : 'AUS');

      var ps = STATE.pathsStats || { heatMax:0, lastPaths:[] };
      addKV('Heatmap-Max', String(ps.heatMax|0));

      var last = (ps.lastPaths||[]).slice(-5).reverse();
      var listBox = document.createElement('div');
      listBox.style.cssText = 'grid-column:1 / span 2;display:flex;flex-direction:column;gap:4px;margin-top:6px';

      if (!last.length){
        var em = document.createElement('div');
        em.textContent = 'Keine Pfade geloggt.';
        em.style.cssText = 'opacity:.6';
        listBox.appendChild(em);
      } else {
        for (var i=0;i<last.length;i++){
          var it = last[i];
          var li = document.createElement('div');
          li.textContent = 'Pfad #' + (i+1) + ' — Länge: ' + (it && it.len || '?');
          li.style.cssText = 'font-size:12px;opacity:.9;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:6px 8px';
          listBox.appendChild(li);
        }
      }
      stat.appendChild(listBox);
    }

    refreshStats();
    box.appendChild(stat);

    target.innerHTML='';
    target.appendChild(box);
  }

  // Registrierung bei Inspector-Core
  function tryRegister(){
    if (!window.__INSPECTOR_API__ || typeof window.__INSPECTOR_API__.registerTab!=='function') return false;
    window.__INSPECTOR_API__.registerTab({
      id: 'paths',
      title: 'Pfade',
      order: 40,
      render: function(ctx){
        renderPathsTab(ctx.body);
        if (ctx.footer) ctx.footer.style.display='none';
      }
    });
    info('Tab registriert (v18.10.5)');
    return true;
  }

  if(!tryRegister()){
    var tries=0, t=setInterval(function(){ tries++; if(tryRegister() || tries>40) clearInterval(t); }, 200);
  }

  // Globale Events auch ohne Tab nutzbar
  window.addEventListener('cb:toggle-path-overlay', function(ev){
    var en = !!(ev && ev.detail && ev.detail.enabled);
    window.DEBUG_PATH_OVERLAY = en;
    STATE.pathsEnabled = en;
    info('toggle via event → %s', en?'on':'off');
  });

})();
