/* ============================================================================
 * assets/inspector/inspector.js — v18.3.2
 * Projekt: Siedler-Mini
 * Ziel:
 *   - Inspector-Panel (Startseite & Ingame)
 *   - Tabs: Übersicht | Logs | Build | Pfade | Tests
 *   - LOGS: robuster CBLog-Anschluss:
 *       • Unterstützt CBLog.dump() / getBuffer() / (_buf|buf) Array
 *       • Hört live auf 'cblog:append' + 'cblog:flush'
 *       • Fallback: eigenes Console-Proxy-Bufferset (nur wenn nötig)
 *   - Öffnen/Schließen via GameUI.toggleInspector() oder FAB
 *
 * Events (sendet/empfängt):
 *   - empfängt:  'cb:toggle-inspector' (optional)
 *   - sendet:    'cb:inspector-open' / 'cb:inspector-close'
 *
 * Visuelle Vorgaben:
 *   - Dunkles, neutrales Grau, runde Ecken, dezente Glows (siehe CSS-Datei)
 *   - Panel position: fixed, centered bottom-ish (draggable später)
 * ========================================================================== */
(function () {
  'use strict';

  // -- Kurzlogger -------------------------------------------------------------
  var L = {
    ok:  (m)=>{ try{ (window.CBLog?.ok||console.log)('[inspector.core] '+m);}catch(_){console.log('[inspector.core] '+m);} },
    info:(m)=>{ try{ (window.CBLog?.info||console.log)('[inspector.core] '+m);}catch(_){console.log('[inspector.core] '+m);} },
    warn:(m)=>{ try{ (window.CBLog?.warn||console.warn)('[inspector.core] '+m);}catch(_){console.warn('[inspector.core] '+m);} },
    err: (m)=>{ try{ (window.CBLog?.err||console.error)('[inspector.core] '+m);}catch(_){console.error('[inspector.core] '+m);} },
  };

  var VERSION = 'v18.3.2';
  var ROOT_ID = 'inspector';
  var OPEN_CLASS = 'open';

  // ===========================================================================
  //  LOG-STREAM (robuste Anbindung an CBLog + Fallback)
  // ===========================================================================
  var LogStream = (function(){
    var _listeners = new Set();
    var _buffer = []; // nur für Fallback
    var _unsub = null;

    // proxy nur, wenn gar kein CBLog existiert
    function ensureFallbackConsole(){
      if (window.CBLog) return; // echte CBLog vorhanden ⇒ kein Proxy nötig
      var orig = {
        log:   console.log.bind(console),
        info:  console.info?.bind(console)  || console.log.bind(console),
        warn:  console.warn?.bind(console)  || console.log.bind(console),
        error: console.error?.bind(console) || console.log.bind(console),
      };
      ['log','info','warn','error'].forEach(function(fn){
        console[fn] = function(){
          try{
            var ts = new Date().toLocaleTimeString();
            var lvl = (fn==='error'?'ERR':fn==='warn'?'WARN':fn==='info'?'INFO':'LOG');
            var line = '['+ts+'] '+lvl+' '+Array.from(arguments).map(s=>String(s)).join(' ');
            _buffer.push(line);
            _emit(line);
          }catch(_){}
          orig[fn](...arguments);
        };
      });
      L.info('Console-Fallback aktiv (kein CBLog gefunden).');
    }

    function _emit(lineOrArray){
      _listeners.forEach(fn=>{
        try{ fn(lineOrArray); }catch(_){}
      });
    }

    function _readFromCBLog(){
      try{
        if (window.CBLog?.dump){
          var s = window.CBLog.dump();
          return (typeof s==='string') ? s.split('\n') : (Array.isArray(s)?s:[]);
        }
        if (window.CBLog?.getBuffer){
          var a = window.CBLog.getBuffer();
          return Array.isArray(a) ? a.slice() : [];
        }
        if (Array.isArray(window.CBLog?._buf)) return window.CBLog._buf.slice();
        if (Array.isArray(window.CBLog?.buf))  return window.CBLog.buf.slice();
      }catch(_){}
      return null;
    }

    function subscribe(fn){
      _listeners.add(fn);
      return function(){ _listeners.delete(fn); };
    }

    function start(){
      // 1) Live-Events von CBLog (falls Polyfill/Lib sie feuert)
      var onAppend = function(e){ _emit(e?.detail || e || ''); };
      var onFlush  = function(){ _emit('[flush]'); };

      window.addEventListener('cblog:append', onAppend);
      window.addEventListener('cblog:flush',  onFlush);

      _unsub = function(){
        window.removeEventListener('cblog:append', onAppend);
        window.removeEventListener('cblog:flush',  onFlush);
      };

      // 2) Fallback-Console nur, wenn gar kein Puffer lesbar
      var initial = _readFromCBLog();
      if (!initial){
        ensureFallbackConsole();
      }
      return initial || _buffer.slice();
    }

    function stop(){ if (_unsub){ try{_unsub();}catch(_){ } _unsub=null; } }

    function readAll(){
      var fromCB = _readFromCBLog();
      if (fromCB) return fromCB;
      return _buffer.slice();
    }

    return { subscribe, start, stop, readAll };
  })();

  // ===========================================================================
  //  UI: Grundgerüst
  // ===========================================================================
  function h(tag, attrs, children){
    var el = document.createElement(tag);
    if (attrs){
      for (var k in attrs){
        var v = attrs[k];
        if (k==='class') el.className = v;
        else if (k==='style') el.style.cssText = v;
        else if (k.startsWith('on') && typeof v==='function') el.addEventListener(k.substring(2), v);
        else el.setAttribute(k, v);
      }
    }
    if (children){
      if (!Array.isArray(children)) children=[children];
      children.forEach(function(c){
        if (c==null) return;
        if (typeof c==='string') el.appendChild(document.createTextNode(c));
        else el.appendChild(c);
      });
    }
    return el;
  }

  var state = {
    root: null,
    tabs: { active: 'logs' },
    logEls: { pre:null, btnCopy:null, badge:null },
    unsubLog: null,
    started: false
  };

  function buildUI(){
    // Root
    var root = document.getElementById(ROOT_ID);
    if (!root){
      root = h('div', { id: ROOT_ID, class: 'inspector-panel' });
      document.body.appendChild(root);
    } else {
      root.innerHTML='';
    }

    // Header
    var head = h('div', { class:'insp-head' }, [
      h('div', { class:'insp-title' }, 'Inspector'),
      h('div', { class:'insp-ver' }, VERSION),
      h('button', { class:'insp-close', onclick: onClose }, 'Schließen')
    ]);

    // Tabs-Bar
    var tabs = h('div', { class:'insp-tabs' }, [
      tabBtn('overview','Übersicht'),
      tabBtn('logs','Logs'),
      tabBtn('build','Build'),
      tabBtn('paths','Pfade'),
      tabBtn('tests','Tests'),
    ]);

    // Bodies
    var body = h('div', { class:'insp-body' });

    var viewOverview = h('div', { class:'tab tab-overview' }, [
      h('div', { class:'muted' }, 'Übersicht (kommt als Nächstes: FPS/Canvas/Map/Runtime).')
    ]);

    var logPre  = h('pre', { class:'log-view', 'aria-label':'Log-Ausgabe' }, '[CBLog nicht verfügbar]');
    var logCopy = h('button', { class:'btn', onclick: function(){ copyLogs(logPre); } }, 'Kopieren');
    var logBadge= h('span', { class:'badge' }, '0');
    var viewLogs = h('div', { class:'tab tab-logs' }, [
      h('div', { class:'tab-inset-head' }, [
        h('span', { class:'muted'}, 'Live-Logs'),
        h('span', { class:'spacer' }),
        h('span', { class:'muted'}, 'Zeilen: '), logBadge
      ]),
      logPre,
      h('div', { class:'tab-actions' }, [ logCopy ])
    ]);

    var viewBuild = h('div', { class:'tab tab-build' }, [
      h('div', { class:'muted' }, 'Build-Werkzeuge (Platzhalter).')
    ]);

    var viewPaths = h('div', { class:'tab tab-paths' }, [
      h('div', { class:'muted' }, 'Pfade / Heatmap (Platzhalter).')
    ]);

    var viewTests = h('div', { class:'tab tab-tests' }, [
      h('div', { class:'muted' }, 'Test-Tools (Platzhalter).')
    ]);

    body.appendChild(viewOverview);
    body.appendChild(viewLogs);
    body.appendChild(viewBuild);
    body.appendChild(viewPaths);
    body.appendChild(viewTests);

    root.appendChild(head);
    root.appendChild(tabs);
    root.appendChild(body);

    state.root = root;
    state.logEls.pre = logPre;
    state.logEls.btnCopy = logCopy;
    state.logEls.badge = logBadge;

    // Anfangszustand
    activateTab(state.tabs.active || 'logs');

    // Start Log-Stream
    startLogs();

    L.ok('bereit ('+VERSION+')');
    return root;
  }

  function tabBtn(id, label){
    return h('button', {
      class:'insp-tab'+(state.tabs.active===id?' active':''),
      onclick: function(){ activateTab(id); }
    }, label);
  }

  function activateTab(id){
    state.tabs.active = id;
    var root = state.root;
    if (!root) return;
    var btns = root.querySelectorAll('.insp-tab');
    btns.forEach(function(b){
      if (b.textContent===labelFor(id)) b.classList.add('active'); else b.classList.remove('active');
    });
    var tabs = root.querySelectorAll('.tab');
    tabs.forEach(function(t){ t.style.display='none'; });
    var sel = root.querySelector('.tab-'+id);
    if (sel) sel.style.display='block';
  }
  function labelFor(id){
    return id==='overview'?'Übersicht':
           id==='logs'?'Logs':
           id==='build'?'Build':
           id==='paths'?'Pfade':
           id==='tests'?'Tests': id;
  }

  function onClose(){
    if (!state.root) return;
    state.root.classList.remove(OPEN_CLASS);
    state.root.style.display='none';
    stopLogs();
    window.dispatchEvent(new Event('cb:inspector-close'));
  }

  // ===========================================================================
  //  LOGS
  // ===========================================================================
  function startLogs(){
    stopLogs();

    // initiale Füllung
    var initial = LogStream.start();
    if (initial && initial.length){
      renderLogBuffer(initial);
    } else {
      renderLogText('[Warte auf Log-Ereignisse…]');
    }

    // live stream
    state.unsubLog = LogStream.subscribe(function(lineOrArray){
      if (!state.logEls.pre) return;
      if (Array.isArray(lineOrArray)){
        appendLogLines(lineOrArray);
      } else {
        appendLogLines([String(lineOrArray||'')]);
      }
    });

    // forced refresh beim (Re-)Öffnen
    refreshLogsHard();
  }

  function stopLogs(){
    if (state.unsubLog){ try{ state.unsubLog(); }catch(_){ } state.unsubLog=null; }
    try{ LogStream.stop(); }catch(_){}
  }

  function refreshLogsHard(){
    var all = LogStream.readAll();
    if (all && all.length) renderLogBuffer(all);
  }

  function renderLogBuffer(lines){
    var txt = lines.join('\n');
    renderLogText(txt);
    setBadge(lines.length);
  }

  function appendLogLines(lines){
    var pre = state.logEls.pre; if (!pre) return;
    var had = pre.textContent || '';
    if (had === '[CBLog nicht verfügbar]' || had.startsWith('[Warte')) had='';
    var next = (had ? had+'\n' : '') + lines.join('\n');
    pre.textContent = next;
    setBadge(next ? next.split('\n').length : 0);
    try{ pre.scrollTop = pre.scrollHeight; }catch(_){}
  }

  function renderLogText(txt){
    var pre = state.logEls.pre; if (!pre) return;
    pre.textContent = String(txt||'[CBLog nicht verfügbar]');
    try{ pre.scrollTop = pre.scrollHeight; }catch(_){}
  }

  function setBadge(n){
    if (!state.logEls.badge) return;
    state.logEls.badge.textContent = String(n|0);
  }

  function copyLogs(pre){
    try{
      var v = pre?.textContent || '';
      navigator.clipboard?.writeText(v);
      L.ok('Logs kopiert');
    }catch(e){
      L.warn('Clipboard fehlgeschlagen: '+(e?.message||e));
    }
  }

  // ===========================================================================
  //  ÖFFNEN / INITIALISIEREN
  // ===========================================================================
  function openInspector(){
    if (!state.root) buildUI();
    state.root.style.display='block';
    state.root.classList.add(OPEN_CLASS);
    startLogs(); // jedes Öffnen: stream sicherstellen
    window.dispatchEvent(new Event('cb:inspector-open'));
  }

  function toggleInspector(){
    if (!state.root) buildUI();
    var vis = state.root.style.display!=='none';
    if (vis) onClose(); else openInspector();
  }

  // Expose für UI-Bridge / FAB:
  window.GameUI = window.GameUI || {};
  if (typeof window.GameUI.toggleInspector!=='function'){
    window.GameUI.toggleInspector = toggleInspector;
  }

  // Auto-init: kleines Polling, damit (Start- oder Spielseite) immer greift
  (function auto(){
    if (state.started) return; state.started = true;
    try{
      // wenn Startseite/Spiel lädt, sofort bereit melden
      L.ok('geladen ('+VERSION+')');
      // optional automatisch öffnen, wenn query ?inspector=1
      if (location.search.indexOf('inspector=1')!==-1){
        setTimeout(openInspector, 150);
      }
    }catch(_){}
  })();

})();
