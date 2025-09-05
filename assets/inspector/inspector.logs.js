/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini – Inspector (Logs-Tab)
 * Version: v18.10.6
 *
 * Zweck
 *  - Liest CBLog-Puffer (Polyfill oder natives CBLog)
 *  - Rendert Log-Liste im Inspector-Panel (NICHT floating)
 *  - Filter: Level-Badges + Textsuche
 *  - Aktionen: Kopieren, Export (JSONL)
 *
 * Integration
 *  - Erwartet, dass inspector.core.js #inspector, .ins-tabs, .ins-body, .ins-footer
 *    erzeugt und ein Tab-Framework bereitstellt (CustomEvent 'ins:tab', detail.id).
 *  - Registriert sich einmalig als Renderer für Tab "logs".
 *
 * Fallbacks
 *  - Wenn kein CBLog existiert, wird der console-Proxy-Puffer aus cblog.polyfill genutzt.
 *  - Entfernt evtl. alte floating Toolbars (#ins-logbar-floating, .ins-log-probe) beim Start.
 * ============================================================================ */
(function(){
  'use strict';

  var MOD = '[inspector.logs]';
  var VER = 'v18.10.6';

  // ----------------------------- Utils / Log --------------------------------
  var ok   = (m)=> (window.CBLog?.ok||console.log)(MOD+' '+m);
  var warn = (m)=> (window.CBLog?.warn||console.warn)(MOD+' '+m);

  // ------------------------- Altlasten wegräumen -----------------------------
  (function purgeFloating()){
    try{
      var old = document.getElementById('ins-logbar-floating');
      if (old) old.remove();
      document.querySelectorAll('.ins-log-probe,.ins-logs-fab').forEach(n=>n.remove());
    }catch(_){}
  })();

  // ------------------------------ Datenquelle --------------------------------
  // Quelle kapseln, damit Polyfill/echtes CBLog egal ist
  function getBuffer(){
    try{
      if (window.CBLog && typeof CBLog.getBuffer==='function') {
        return CBLog.getBuffer(); // [{ts,level,tag,msg}]
      }
    }catch(_){}
    // Polyfill/Proxy: auf _buf/_buffer ausweichen
    try{
      var p = (window.CBLog && (CBLog._buf||CBLog._buffer)) || window.__CBLOG_BUF__ || [];
      return Array.isArray(p) ? p : [];
    }catch(_){}
    return [];
  }

  var LEVELS = ['ERR','WARN','OK','INFO','LOG','DBG','TRACE'];

  // ------------------------------ DOM Helpers --------------------------------
  function el(tag, cls, txt){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt!=null) n.textContent = txt;
    return n;
  }

  // Badge-Button
  function levelBadge(label, active){
    var b = el('button', 'ins-badge'+(active?' active':''));
    b.type = 'button';
    b.dataset.level = label;
    b.textContent = label;
    return b;
  }

  // ------------------------------- State -------------------------------------
  var state = {
    filterText : '',
    activeLvls : new Set(['ERR','WARN','OK','INFO','LOG']), // Default sichtbar
    listEl     : null, // <pre>
    searchEl   : null,
    toolbarEl  : null,
    footerEl   : null,
    unsub      : null  // listener cleanup
  };

  // ----------------------------- Rendering -----------------------------------
  function matchEntry(e){
    // Level
    if (state.activeLvls.size){
      if (!state.activeLvls.has(e.level)) return false;
    }
    // Text
    if (state.filterText){
      var t = (e.msg||'') + ' ' + (e.tag||'') + ' ' + (e.level||'');
      if (!t.toLowerCase().includes(state.filterText)) return false;
    }
    return true;
  }

  function formatEntry(e){
    // Zeit
    var d = e.ts ? new Date(e.ts) : new Date();
    var hh = String(d.getHours()).padStart(2,'0');
    var mm = String(d.getMinutes()).padStart(2,'0');
    var ss = String(d.getSeconds()).padStart(2,'0');

    var lvl = (e.level||'LOG').padEnd(5,' ');
    var tag = e.tag ? (' ['+e.tag+'] ') : ' ';
    var msg = (e.msg!=null ? e.msg : (e.args ? String(e.args) : '')) + '';

    return '['+hh+':'+mm+':'+ss+'] '+lvl+tag+msg;
  }

  function renderList(){
    if (!state.listEl) return;
    var buf = getBuffer();
    var out = [];
    for (var i=0;i<buf.length;i++){
      var e = buf[i];
      if (matchEntry(e)) out.push( formatEntry(e) );
    }
    state.listEl.textContent = out.length ? out.join('\n') : '[Keine Log-Einträge passend zum Filter]';
  }

  // ------------------------------- Toolbar -----------------------------------
  function buildToolbar(container){
    var bar = el('div','ins-log-toolbar');
    // Level badges
    var lvls = el('div','ins-log-badges');
    ['ERR','WARN','OK','INFO','DBG','TRACE'].forEach(function(L){
      var initialOn = state.activeLvls.has(L);
      var b = levelBadge(L, initialOn);
      b.addEventListener('click', function(){
        if (state.activeLvls.has(L)) state.activeLvls.delete(L);
        else state.activeLvls.add(L);
        b.classList.toggle('active');
        renderList();
      });
      lvls.appendChild(b);
    });

    // Suche
    var searchWrap = el('div','ins-log-search');
    var inp = el('input');
    inp.type = 'search';
    inp.placeholder = 'Suche…';
    inp.addEventListener('input', function(){
      state.filterText = (inp.value||'').trim().toLowerCase();
      renderList();
    });
    searchWrap.appendChild(inp);

    // Aktionen
    var acts = el('div','ins-log-actions');
    var btnCopy = el('button','ins-btn', 'Kopieren');
    btnCopy.addEventListener('click', function(){
      try{
        navigator.clipboard.writeText(state.listEl.textContent||'');
      }catch(_){
        // Fallback
        var ta = el('textarea'); ta.style.position='fixed'; ta.style.opacity='0';
        ta.value = state.listEl.textContent||''; document.body.appendChild(ta);
        ta.select(); try{ document.execCommand('copy'); }catch(_){}
        ta.remove();
      }
    });
    var btnExport = el('button','ins-btn', 'Export');
    btnExport.addEventListener('click', function(){
      var buf = getBuffer();
      var filtered = buf.filter(matchEntry);
      var blob = new Blob(filtered.map(x=>JSON.stringify(x)+'\n'), {type:'application/json'});
      var url = URL.createObjectURL(blob);
      var a = el('a'); a.href = url; a.download = 'logs.jsonl';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 0);
    });

    acts.appendChild(btnCopy);
    acts.appendChild(btnExport);

    bar.appendChild(lvls);
    bar.appendChild(searchWrap);
    bar.appendChild(acts);

    container.appendChild(bar);

    state.toolbarEl = bar;
    state.searchEl  = inp;
  }

  // --------------------------- Tab-Lifecycle ---------------------------------
  // Wird vom Core aufgerufen, wenn der Logs-Tab gerendert werden soll.
  // inspector.core.js sollte window.__INSPECTOR_TABS__.logs = renderLogs; setzen.
  function renderLogs(bodyEl, footerEl){
    // Body leeren
    bodyEl.innerHTML = '';
    footerEl.innerHTML = '';
    footerEl.classList.add('ins-footer--tools');

    // Toolbar in Footer einbetten
    buildToolbar(footerEl);

    // Liste
    var pre = el('pre','ins-log-list');
    pre.textContent = 'Logs werden initialisiert …';
    bodyEl.appendChild(pre);
    state.listEl = pre;

    // initialer Render
    renderList();

    // Optional: vereinzelte Live-Updates (leicht)
    if (!state.unsub){
      var tick = ()=>renderList();
      window.addEventListener('cb:log-update', tick);
      state.unsub = ()=>window.removeEventListener('cb:log-update', tick);
    }

    ok('Tab aufgebaut ('+VER+')');
  }

  // ---------------------------- Registrierung --------------------------------
  window.__INSPECTOR_TABS__ = window.__INSPECTOR_TABS__ || {};
  window.__INSPECTOR_TABS__.logs = renderLogs;

  ok('geladen ('+VER+')');
})();
